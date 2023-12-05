export interface DTCRequest {
    SYS_ID: string,
    StudentId: string,
    courseno: string,
    computercode: string,
    coursecategory: string
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