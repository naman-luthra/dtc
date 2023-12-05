import { convertJSONToCSV } from "@/util/util";

export default function TableView({ table, className, downloadFile, title, children }: { 
    table: any[]; 
    className?: string;
    downloadFile?: string;
    title?: string;
    children?: React.ReactNode;
  }){
    const headers: string[] = [];
    for(const key in table[0])
      headers.push(key)
    if(!table) return <></>;
    const uri = convertJSONToCSV(table, headers);
    return (
      <div className={`grow flex gap-2 pb-2 ${className}`}>
        <div className="overflow-auto pr-4 w-full">
          <table className="table-auto w-full">
            <thead>
              <tr className="bg-slate-800 text-white">
                {headers.map((header) => (
                  <th className="px-4 py-2">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.map((row) => (
                <tr className="border-b-2 border-x-2">
                  {headers.map((key) => (
                    <td className="px-4 py-2">{row[key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="w-60 text-base">
          <div className="font-bold">{title}</div>
          { 
            downloadFile &&
              <a href={uri} download={downloadFile} className="p-4 bg-blue-600 text-white rounded-md block w-fit mt-2 text-sm">
                Download Table CSV
              </a>
          }
          {
            children
          }
        </div>
      </div>
    );
  }
  