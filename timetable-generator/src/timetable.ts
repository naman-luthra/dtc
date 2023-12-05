import { CourseAvailablity, CourseAvailablityChange, CourseComponent, TimeTableRequest, TineTableIntermediate } from "./types";

/**
 * Converts a string of days into an array of individual days.
 * @param days - The string of days to be converted.
 * @returns An array of individual days.
 */
function getDays (days: string) {
    const out = [];
    for(let i=0; i<days.length; i++){
        if(days[i] === 'T'){
            if(i!=days.length-1 && days[i+1] === 'H'){
                out.push('TH');
                i++;
            }
            else out.push('T');
        }
        else out.push(days[i]);
    }
    return out;
}

/**
 * Checks if there is a conflict between the course component and any course component already in the timetable.
 * @param dayGroups - The day groups of the course component.
 * @param timeTable - The timetable.
 * @returns True if there is a conflict, false otherwise.
 */
function checkConflict(dayGroups: CourseAvailablity[], timeTable: TineTableIntermediate[]){
    // iterating over all day groups of the course component
    for(const dayGroup of dayGroups){
        // iterating over all course components already in the timetable
        for(const timeTableComponent of timeTable){
            // iterating over all day groups of the course component already in the timetable
            for(const timeTableDaysGroup of timeTableComponent.dayGroups){
                // iterating over all days of the course component
                for(const day of getDays(dayGroup.days)){
                    // checking if the day is present in the days of the course component already in the timetable
                    if(getDays(timeTableDaysGroup.days).includes(day)){
                        // checking if the time of the course component already in the timetable lies between the time of the course component
                        const timeTableStartTime = parseInt(timeTableDaysGroup.class_stime.replace(':', ''));
                        const timeTableEndTime = parseInt(timeTableDaysGroup.class_etime.replace(':', ''));
                        const courseStartTime = parseInt(dayGroup.class_stime.replace(':', ''));
                        const courseEndTime = parseInt(dayGroup.class_etime.replace(':', ''));
                        if((courseStartTime >= timeTableStartTime && courseStartTime < timeTableEndTime) ||
                            (courseEndTime > timeTableStartTime && courseEndTime < timeTableEndTime) 
                        ){
                            if(process.env.mode==="DEV") console.log("conflict", dayGroup.subject, dayGroup.catalog, dayGroup.section, `${dayGroup.days} ${courseStartTime}-${courseEndTime}`, timeTableDaysGroup.subject, timeTableDaysGroup.catalog, timeTableDaysGroup.section, `${timeTableDaysGroup.days} ${timeTableStartTime}-${timeTableEndTime}`);
                            // if there is a conflict, return true
                            return true;
                        }
                    }
                }
            }
        }
    }
    // if there is no conflict, return false
    return false;
}

/**
 * Generates a timetable for the given course components.
 * @param i - The index of the course component to be processed.
 * @param courseComponents - The course components to be processed.
 * @param timeTable - The timetable.
 * @param changes - The changes to course availablity.
 * @param changesAllowed - Whether the course availablity can be changed.
 * @param autoAdjust - The components that can be automatically adjusted.
 * @returns True if timetable could be generated, false otherwise.
 */
function generateTimeTableHelper(
    i:number, 
    courseComponents: CourseComponent[], 
    timeTable: TineTableIntermediate[],
    changes: CourseAvailablityChange[],
    changesAllowed: boolean,
    autoAdjust: string[]
){
    // if all course components have been processed, return true
    if(i === courseComponents.length){
        if(process.env.mode==="DEV") console.log("timetable generated");
        return true;
    }

    // sorting sections by number of seats enrolled
    const sections = Array.from(courseComponents[i].sections).sort((s1,s2)=>(s1[1][0].enrolled_total - s2[1][0].enrolled_total));

    // iterating first over sections with no change and then over sections with change
    for(const itr of ["nochange", "change"]){
        for(const [sectionCode, dayGroups] of sections){
            // checking if the section causes conflict with any course component already in the timetable
            const conflict = checkConflict(dayGroups, timeTable);

            // checking if there are seats available in the section
            const seatsAvailable = dayGroups[0].enrolled_capacity - dayGroups[0].enrolled_total;

            if(process.env.mode==="DEV") console.log(courseComponents[i].course ,sectionCode, seatsAvailable, conflict);

            // checking if the section is allowed to be changed
            const changeAllowed = changesAllowed || autoAdjust.includes(courseComponents[i].component)

            if(((itr==="change" && changeAllowed) || seatsAvailable>0) && !conflict){

                timeTable.push({
                    course: courseComponents[i].course,
                    component: courseComponents[i].component,
                    sectionCode,
                    dayGroups
                });
                // if the section has to be changed, add the change to changes
                if(itr==="change" && seatsAvailable<=0){
                    changes.push({
                        course: courseComponents[i].course,
                        component: courseComponents[i].component,
                        section: sectionCode,
                        originalSeats: dayGroups[0].enrolled_capacity,
                        originalTotal: dayGroups[0].enrolled_total,
                        seats: dayGroups[0].enrolled_total + 1
                    });
                    dayGroups[0].enrolled_capacity = dayGroups[0].enrolled_total + 1;
                }

                dayGroups[0].enrolled_total++;
                if(process.env.mode==="DEV") console.log("pushed", dayGroups[0].subject, dayGroups[0].catalog, dayGroups[0].section);

                // if timetable can be generated with the current section, return true
                if(generateTimeTableHelper(i+1, courseComponents, timeTable, changes, changesAllowed, autoAdjust))
                    return true;
                // else pop the current section from timetable and revert changes if any and continue to next section
                if(itr==="change" && seatsAvailable<=0){
                    dayGroups[0].enrolled_capacity = changes[changes.length-1].originalSeats;
                    changes.pop();
                }
                timeTable.pop();
                dayGroups[0].enrolled_total--;
                if(process.env.mode==="DEV") console.log("popped", dayGroups[0].subject, dayGroups[0].catalog, dayGroups[0].section);
            }
        }
    }
    // if timetable could not be generated with any section of the current course component even by increasing seats, return false
    return false;
}

/**
 * Generates a timetable for the given requests.
 * @param reqs - The requests to be processed.
 * @param courseAvailablity - The course availablity.
 * @param changes - The changes to course availablity.
 * @param changesAllowed - Whether the course availablity can be changed.
 * @param autoAdjust - The components that can be automatically adjusted.
 * @returns The generated timetable if it could be generated, null otherwise.
 */
export function generateTimeTable(
    reqs: TimeTableRequest[], 
    courseAvailablity: CourseAvailablity[], 
    changes: Map<string, CourseAvailablityChange>, 
    changesAllowed: boolean, 
    autoAdjust: string[]
){
    if(process.env.mode==="DEV") console.log("generating timetable for requests" + reqs);

    // intermediate data structure to store generated timetable
    const timeTable: TineTableIntermediate[] = [];

    const courseComponents: CourseComponent[] = [];
    // intermediate data structure to store changes to course availablity
    const tempChanges: CourseAvailablityChange[] = [];

    // segregating requests by course and component
    for(const req of reqs){
        // filtering course availablity to get only the course instances of the requested course
        const courseInstances = courseAvailablity.filter((course) =>(
            course.subject === req.courseno.split(' ')[0] &&
            course.catalog === req.courseno.split(' ')[1]
        ));

        // intermediate data structure to store course instances by component and section
        // map of component name to map of section to array of course instances(day groups of the section)
        const components = new Map<string, Map<string,CourseAvailablity[]>>();

        // segregating course instances by component and section
        courseInstances.forEach((courseInstance) => {
            if(components.has(courseInstance.component)){
                const component = components.get(courseInstance.component);
                if(component?.has(courseInstance.section))
                    component.get(courseInstance.section)?.push(courseInstance);
                else
                    component?.set(courseInstance.section, [courseInstance]);
            }
            else{
                const component = new Map<string,CourseAvailablity[]>();
                component.set(courseInstance.section, [courseInstance]);
                components.set(courseInstance.component, component);
            }
        });

        // pushing course components to courseComponents
        for(const [componentName,sections] of components){
            if(process.env.mode==="DEV") console.log(req.courseno, componentName);
            courseComponents.push({
                course: req.courseno,
                component: componentName,
                sections
            })
        }
    }

    // generating timetable
    const generated = generateTimeTableHelper(0, courseComponents, timeTable, tempChanges, changesAllowed, autoAdjust)

    // if timetable could not be generated, return null
    if(!generated)
        return null;
    // else update course availablity changes and return timetable
    else{
        for(const change of tempChanges){
            const existingChange = changes.get(`${change.course}-${change.section}`);
            if (existingChange)
                existingChange.seats = change.seats;
            else
                changes.set(`${change.course}-${change.section}`, change);
        }
        return timeTable;
    }
}