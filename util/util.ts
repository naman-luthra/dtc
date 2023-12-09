/**
 * Converts JSON data to CSV format.
 * 
 * @param table - The JSON data to convert to CSV.
 * @param headersInp - Optional array of headers for the CSV. If not provided, the keys of the first object in the JSON data will be used as headers.
 * @returns The URI-encoded CSV content.
 */
export function convertJSONToCSV(table: any[], headersInp?: string[]) {
    const headers: string[] = headersInp || [];
    if(!headersInp){
      for(const key in table[0])
        headers.push(key)
    }
    const  csvContent = 
      "data:text/csv;charset=utf-8," 
      + headers.map(h=>`"${h}"`).join(",")
      + "\n" 
      + table.map((row) => headers.map(h=>`"${row[h]}"`).join(",")).join("\n");
    const uri = encodeURI(csvContent);
    return uri;
}


/**
 * Converts a CSV string to JSON.
 * @param csvStr - The CSV string to be converted.
 * @param specialConversions - The special conversions to be applied.
 * @returns The JSON object.
 */
export function convertCSVToJSON(csvStr: string, specialConversions: {
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