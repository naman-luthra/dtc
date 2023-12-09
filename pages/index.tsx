"use client";
import TableView from "@/components/TableView";
import { convertJSONToCSV } from "@/util/util";
import { useState } from "react";
import { BiUpload } from "react-icons/bi";
import { CourseAvailablityChange, DTCRequest, TimeTable } from "../util/types";
import { Loading } from "@/components/Loading";
import Head from "next/head";

export default function Home() {
  const [dtcRequestsFile, setDtcRequestsFile] = useState<{
    name: string;
    data: string;
  } | null>(null);
  const [groupCourseFile, setGroupCourseFile] = useState<{
    name: string;
    data: string;
  } | null>(null);
  const [coursesAvailablityFile, setCoursesAvailablityFile] = useState<{
    name: string;
    data: string;
  } | null>(null);

  const [mode, setMode] = useState<number>(1);
  const [semesterCode, setSemesterCode] = useState<number | undefined>();
  const [suggestedChanges, setSuggestedChanges] = useState<CourseAvailablityChange[]>([]);
  const [unprocessedRequests, setUnprocessedRequests] = useState<DTCRequest[] | number>([]);
  const [timetable, setTimetable] = useState<TimeTable[]>([]);
  const [showSuggestedChanges, setShowSuggestedChanges] = useState<boolean>(false);
  const [showTimetable, setShowTimetable] = useState<boolean>(false);
  const [autoAdjustLT, setAutoAdjustLT] = useState<boolean>(false);
  const [updatedCourseAvailablityCSV, setUpdatedCourseAvailablityCSV] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const filesUploaded =
    (dtcRequestsFile !== null || groupCourseFile !== null) && coursesAvailablityFile !== null;

  const onChangeHandler = async (
    event: React.ChangeEvent<HTMLInputElement>,
    mode: string
  ) => {
    if (event.target.files) {
      console.log(event.target.files);
      const file = event.target.files[0];
      const data = await file.text();
      if (mode === "dtc")
        setDtcRequestsFile({
          name: file.name,
          data,
        });
      else if(mode === "group-course")
        setGroupCourseFile({
          name: file.name,
          data,
        });
      else
        setCoursesAvailablityFile({
          name: file.name,
          data,
        });
    }
  };

  const onSubmitHandler = async (changes: boolean, mode: string) => {
    setLoading(true);
    let res:{
      generatedTimeTables: TimeTable[];
      changes: CourseAvailablityChange[];
      unprocessedRequests: DTCRequest[] | number;
      updatedCourseAvailablity: any[];
    };
    if(mode==="csv"){
      res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/generate-timetable-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dtcRequests: dtcRequestsFile?.data,
          courseAvailablity: coursesAvailablityFile?.data,
          semesterCode: semesterCode,
          changesAllowed: changes,
          autoAdjust: autoAdjustLT ? ["LEC","TUT"] : []
        }),
      }).then((res) => res.json());
      setUpdatedCourseAvailablityCSV(convertJSONToCSV(res.updatedCourseAvailablity));
      if (changes) {
        setSuggestedChanges(res.changes);
        setShowSuggestedChanges(true);
      } else {
        setTimetable(res.generatedTimeTables);
        setUnprocessedRequests(res.unprocessedRequests);
        setShowTimetable(true);
      }
      console.log(res)
    }
    else if(mode==="group-course"){
      res = await fetch("http://localhost:8080/generate-timetable-groupcourse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupCourse: groupCourseFile?.data,
          courseAvailablity: coursesAvailablityFile?.data,
          semesterCode: semesterCode,
          changesAllowed: changes,
          autoAdjust: autoAdjustLT ? ["LEC","TUT"] : []
        }),
      }).then((res) => res.json());
      console.log(res);
      setUpdatedCourseAvailablityCSV(convertJSONToCSV(res.updatedCourseAvailablity));
      if (changes) {
        setSuggestedChanges(res.changes);
        setShowSuggestedChanges(true);
      } else {
        setTimetable(res.generatedTimeTables);
        setUnprocessedRequests(res.unprocessedRequests);
        setShowTimetable(true);
      }
    }
    setLoading(false);
  };

  switch (mode) {
    case 1:
      return (
        <main className="grid place-content-center min-h-screen">
          <Head>
            <title>DTC TimeTable generator</title>
          </Head>
          <div className="text-center text-3xl">DTC TimeTable generator</div>
          <div className="flex flex-col gap-4 mt-8">
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setMode(2)}
                className="p-4 rounded-xl bg-blue-500 text-white hover:opacity-80"
              >
                Use Request File
              </button>
              <button
                onClick={() => setMode(3)}
                className="p-4 rounded-xl bg-blue-500 text-white hover:opacity-80"
              >
                Use Group Course File
              </button>
            </div>
          </div>
        </main>
      );
    case 2:
    case 3:
      return (
        <main className="grid place-content-center min-h-screen">
          <Head>
            <title>DTC TimeTable generator</title>
          </Head>
          <div className="text-center text-3xl">DTC TimeTable generator</div>
          <div className="flex flex-col gap-4 mt-8">
            <div className="flex justify-center gap-4">
              <div className="">
                <div
                  className="cursor-pointer bg-blue-500 text-white p-4 rounded-xl flex gap-2 hover:opacity-80"
                  onClick={() =>
                    document.getElementById("dtc-requests")?.click()
                  }
                >
                  <div className="self-center">{mode==2 ? "DTC Requests" : "Group Course File"}</div>
                  <BiUpload className="inline-block self-center text-xl" />
                  <input
                    id="dtc-requests"
                    name="dtcRequests"
                    type="file"
                    accept=".csv"
                    onChange={(e) => onChangeHandler(e, mode==2 ? "dtc" : "group-course")}
                    style={{ display: "none" }}
                    required
                  />
                </div>
                <div className="text-xs w-10 text-ellipsis">
                  { mode==2 ? dtcRequestsFile?.name : groupCourseFile?.name }
                </div>
              </div>
              <div>
                <div
                  className="cursor-pointer bg-blue-500 text-white p-4 rounded-xl flex gap-2 hover:opacity-80"
                  onClick={() =>
                    document.getElementById("courses-availablity")?.click()
                  }
                >
                  <div className="self-center">Course Availablity</div>
                  <BiUpload className="inline-block self-center text-xl" />
                  <input
                    id="courses-availablity"
                    name="courseAvailablity"
                    type="file"
                    accept=".csv"
                    onChange={(e) => onChangeHandler(e, "course")}
                    style={{ display: "none" }}
                    required
                  />
                </div>
                <div className="text-xs w-10 text-ellipsis">
                  {coursesAvailablityFile?.name}
                </div>
              </div>
            </div>
            <input
              type="text"
              value={semesterCode}
              placeholder="Semester Code"
              onChange={(e) => {
                if (e.target.value === "") setSemesterCode(undefined);
                else if (!Number.isNaN(parseInt(e.target.value)))
                  setSemesterCode(parseInt(e.target.value));
              }}
              className="px-4 py-2 text-black rounded-lg"
            />
            <div className="flex justify-center items-center gap-2">
              <input onChange={e => {
                setAutoAdjustLT(e.target.checked)
                }} type="checkbox" name="" id="" />
              <div>Auto adjust for L/T</div>
            </div>
            <div className="flex gap-4 justify-center">
            <button
              disabled={!filesUploaded}
              className="bg-gray-700 text-white p-3 rounded-xl w-fit self-center disabled:opacity-80 hover:opacity-80"
              type="submit"
              onClick={() => onSubmitHandler(true, mode==2 ? "csv" : "group-course")}
            >
              Validate
            </button>
            <button
              disabled={!filesUploaded}
              className="bg-gray-700 text-white p-3 rounded-xl w-fit self-center disabled:opacity-80 hover:opacity-80"
              type="submit"
              onClick={() => onSubmitHandler(false, mode==2 ? "csv" : "group-course")}
            >
              Generate
            </button>
            </div>

            {showSuggestedChanges && (
              <div onClick={()=>setShowSuggestedChanges(false)} className="absolute top-0 left-0 h-screen w-full flex items-center justify-center">
              <div onClick={e=>e.stopPropagation()} className="bg-white text-black rounded-md p-4 mx-10 h-2/3 flex flex-col gap-4 overflow-hidden relative">
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => setShowSuggestedChanges(false)}
                    className="text-2xl leading-4"
                  >
                    &times;
                  </button>
                </div>
                  <TableView title="Suggested Changes" downloadFile="changes.csv" table={suggestedChanges} className="h-full text-xs" >
                  {
                    updatedCourseAvailablityCSV &&
                    <a href={updatedCourseAvailablityCSV} download="updatedCourseAvailablity.csv" className="p-4 bg-blue-600 text-white rounded-md block w-fit mt-2 text-sm">
                      Download Updated Course Availablity
                    </a>
                  }
                  </TableView>
                </div>
              </div>
            )}

            {showTimetable && (
              <div onClick={()=>setShowSuggestedChanges(false)} className="absolute top-0 left-0 h-screen w-full flex items-center justify-center">
                <div onClick={e=>e.stopPropagation()} className="bg-white text-black rounded-md p-4 mx-10 h-2/3 flex flex-col gap-4 overflow-hidden relative">
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => setShowTimetable(false)}
                      className="text-2xl leading-4"
                    >
                      &times;
                    </button>
                  </div>
                  <TableView downloadFile="timetable.csv" title="TimeTables" table={timetable} className={`text-xs ${Array.isArray(unprocessedRequests) ? "h-[40%]" : "h-full"}`}>
                  {
                    updatedCourseAvailablityCSV &&
                    <a href={updatedCourseAvailablityCSV} download="updatedCourseAvailablity.csv" className="p-4 bg-blue-600 text-white rounded-md block w-fit mt-2 text-sm">
                      Download Updated Course Availablity
                    </a>
                  }
                  </TableView>
                  {
                    Array.isArray(unprocessedRequests) &&
                    <TableView downloadFile="requests.csv" title="Unprocessed Requests" table={unprocessedRequests} className="text-xs h-[40%]" />
                  }
                </div>
              </div>
            )}
          </div>
          {
            loading &&
            <Loading />
          }
        </main>
      );
  }
}
