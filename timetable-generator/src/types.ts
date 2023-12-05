export interface DTCRequest {
    SYS_ID: string,
    StudentId: string,
    courseno: string,
    computercode: string,
    coursecategory: string
}

export interface CourseAvailablity {
    semester: number,
    subject: string,
    catalog: string,
    course_id: number,
    component: string,
    section: string,
    classno: string,
    days: string,
    class_stime: string,
    class_etime: string,
    enrolled_capacity: number,
    enrolled_total: number
}

export interface TimeTableRequest {
    courseno: string
}

export interface TineTableIntermediate {
    course: string,
    component: string,
    sectionCode: string,
    dayGroups: CourseAvailablity[]
}

interface TimeTableStudent {
    semesterCode: number,
    systemId: string,
    studentId: string,
    courseCode: string,
    courseId: number,
    component: string,
    section: string,
    classno: string
} 

interface TimeTableSerial {
    serialNo: number,
    group: string,
    semesterCode: number,
    courseCode: string,
    courseId: number,
    component: string,
    section: string,
    classno: string
}

export type TimeTable = TimeTableStudent | TimeTableSerial;

export interface CourseAvailablityChange {
    course: string,
    component: string,
    section: string,
    originalSeats: number,
    originalTotal: number,
    seats: number
}

export interface CourseComponent {
    course: string,
    component: string,
    sections: Map<string, CourseAvailablity[]>
}