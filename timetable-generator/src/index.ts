import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cors from 'cors';
import { CourseAvailablity, CourseAvailablityChange, DTCRequest, TimeTable } from './types';
import { generateTimeTable } from './timetable';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json({
    limit: '50mb'
}));

app.use(cors({
    origin: '*'
}));


/**
 * Converts a CSV string to JSON.
 * @param csvStr - The CSV string to be converted.
 * @param specialConversions - The special conversions to be applied.
 * @returns The JSON object.
 */
function csvToJSON(csvStr: string, specialConversions: {
    name: string,
    convertUsing: (s: string)=>any
}[] = []): any[]{
    const csvSplitted: string[] = csvStr.split('\n');
    const headers: string[] = csvSplitted[0].split(',').map(s=>s.trim().replace(/['"]+/g, ''));
    const csvObjects = csvSplitted.slice(1).map((row: string) =>{
        const csvObj: any = {};
        row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s=>s.trim().replace(/['"]+/g, '')).forEach((cell, i) => {
            csvObj[headers[i]] = cell.trim().replace(/['"]+/g, '');
        });
        specialConversions.forEach(({name, convertUsing})=>{
            csvObj[name] = convertUsing(csvObj[name]);
        });
        return csvObj;
    });
    return csvObjects;
}

app.post('/generate-timetable-requests', (req, res) => {
    const { dtcRequests: dtcRequestsCSV, courseAvailablity: courseAvailablityCSV, semesterCode, changesAllowed, autoAdjust } = req.body;

    // Parsing Course Availablity to JSON
    const courseAvailablityUnfiltered = csvToJSON(courseAvailablityCSV, [
        {
            name: "enrolled_capacity",
            convertUsing: parseInt
        },
        {
            name: "enrolled_total",
            convertUsing: parseInt
        }
    ]);

    // Storing a deep copy of courseAvailablityUnfiltered
    const courseAvailablityUadultrated = JSON.parse(JSON.stringify(courseAvailablityUnfiltered));

    // Filtering courseAvailablity to only include courses of the current semester
    const courseAvailablity: CourseAvailablity[] = courseAvailablityUnfiltered.filter((course: any) => parseInt(course.semester) === semesterCode);

    // Parsing DTC Requests to JSON
    const dtcRequests: DTCRequest[] = csvToJSON(dtcRequestsCSV);

    // Segregating requests by student
    const dtcRequestsByStudent = new Map<string, DTCRequest[]>();
    dtcRequests.forEach((req) => {
        if (dtcRequestsByStudent.has(req.StudentId)) {
            if(!dtcRequestsByStudent.get(req.StudentId)?.find((r)=>r.courseno===req.courseno))
                dtcRequestsByStudent.get(req.StudentId)?.push(req);
        } else {
            dtcRequestsByStudent.set(req.StudentId, [req]);
        }
    });

    // array to store generated timetables
    const generatedTimeTables: TimeTable[] = [];
    // array to store unprocessed requests
    const unprocessedRequests: DTCRequest[] = [];
    // map to store changes to course availablity
    const changes = new Map<string, CourseAvailablityChange>();

    // generating timetable for each student
    for(const [studentId, requests] of dtcRequestsByStudent){
        const genTimetable = generateTimeTable(requests, courseAvailablity, changes, changesAllowed, autoAdjust );
        // if timetable could not be generated, add all requests to unprocessedRequests
        if(genTimetable===null){
            unprocessedRequests.push(...requests);
        }
        // else add all courses components in timetable to generatedTimeTables
        else{
            for(const courseComponent of genTimetable){
                generatedTimeTables.push({
                    semesterCode,
                    systemId: requests[0].SYS_ID,
                    studentId: studentId,
                    courseCode: courseComponent.course,
                    courseId: courseComponent.dayGroups[0].course_id,
                    component: courseComponent.component,
                    section: courseComponent.sectionCode,
                    classno: courseComponent.dayGroups[0].classno
                });
            }
            if(process.env.mode==="DEV") console.log(genTimetable);
        }
    }

    const nonAutoChangesArray: CourseAvailablityChange[] = [];
    let updatedCourseAvailablity: any[] = courseAvailablityUadultrated
    for(const [_, value] of changes){
        if(!autoAdjust.includes(value.component)){
            nonAutoChangesArray.push(value);
        }
        else{
            updatedCourseAvailablity = updatedCourseAvailablity.map(c=>{
                if(
                    parseInt(c.semester)===semesterCode 
                    && c.subject===value.course.split(' ')[0] 
                    && c.catalog===value.course.split(' ')[1] 
                    && c.component===value.component 
                    && c.section===value.section ){
                    c.enrolled_capacity = value.seats;
                }
                return c;
            });
        }
    }
    res.status(200).json({generatedTimeTables, unprocessedRequests, changes: nonAutoChangesArray, updatedCourseAvailablity});
});

app.post('/generate-timetable-groupcourse', (req, res) => {
    const { 
        groupCourse: groupCourseCSV,
        courseAvailablity: courseAvailablityCSV,
        semesterCode,
        changesAllowed,
        autoAdjust
    } = req.body;
    // Parsing Course Availablity to JSON
    const courseAvailablityUnfiltered = csvToJSON(courseAvailablityCSV, [
        {
            name: "enrolled_capacity",
            convertUsing: parseInt
        },
        {
            name: "enrolled_total",
            convertUsing: parseInt
        }
    ]);

    // Storing a deep copy of courseAvailablityUnfiltered
    const courseAvailablityUadultrated = JSON.parse(JSON.stringify(courseAvailablityUnfiltered));

    // Filtering courseAvailablity to only include courses of the current semester
    const courseAvailablity: CourseAvailablity[] = courseAvailablityUnfiltered.filter((course: any) => parseInt(course.semester) === semesterCode);

    // Parsing Group Course to JSON
    const groupCourseObj: {
        group: string,
        courseCode: string,
        numberOfTimetables: string
    }[] = csvToJSON(groupCourseCSV);
    const groupCourse = new Map<string, {
        numberOfTimetables: number,
        courses: string[]
    }>();

    groupCourseObj.forEach((go) =>{
        const {
            group, 
            courseCode, 
            numberOfTimetables
        } = go;
        if(groupCourse.has(group)){
            groupCourse.get(group)?.courses.push(courseCode);
        }
        else{
            groupCourse.set(group, {
                numberOfTimetables: parseInt(numberOfTimetables),
                courses: [courseCode]
            });
        }
    });
    // array to store generated timetables
    const generatedTimeTables: TimeTable[] = [];

    // initializing variables to store number of unprocessed and processed requests
    let unprocessedRequests = 0, processedRequests = 0;

    // map to store changes to course availablity
    const changes = new Map<string, CourseAvailablityChange>();

    groupCourse.forEach(({numberOfTimetables, courses}, group) => {
        for(let i=0; i<numberOfTimetables; i++){
            const genTimetable = generateTimeTable(courses.map((c: string)=>({courseno: c})), courseAvailablity, changes, changesAllowed, autoAdjust);
            if(genTimetable===null){
                unprocessedRequests+=numberOfTimetables-i;
                break;
            }
            else{
                processedRequests++;
                for(const courseComponent of genTimetable){
                    generatedTimeTables.push({
                        serialNo: processedRequests,
                        group,
                        semesterCode,
                        courseCode: courseComponent.course,
                        courseId: courseComponent.dayGroups[0].course_id,
                        component: courseComponent.component,
                        section: courseComponent.sectionCode,
                        classno: courseComponent.dayGroups[0].classno
                    });
                }
            }
        }
    });

    if(process.env.mode==="DEV") console.log("generated", generatedTimeTables);

    const nonAutoChangesArray: CourseAvailablityChange[] = [];
    let updatedCourseAvailablity: any[] = courseAvailablityUadultrated
    for(const [_, value] of changes){
        if(!autoAdjust.includes(value.component)){
            nonAutoChangesArray.push(value);
        }
        else{
            updatedCourseAvailablity = updatedCourseAvailablity.map(c=>{
                if(
                    parseInt(c.semester)===semesterCode 
                    && c.subject===value.course.split(' ')[0] 
                    && c.catalog===value.course.split(' ')[1] 
                    && c.component===value.component 
                    && c.section===value.section ){
                    c.enrolled_capacity = value.seats;
                }
                return c;
            });
        }
    }
    res.status(200).json({generatedTimeTables, unprocessedRequests, changes: nonAutoChangesArray, updatedCourseAvailablity});
});

app.listen(PORT, () => {
    console.log('Server is listening on port 8080!');
});