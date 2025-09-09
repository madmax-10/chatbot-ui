import { useState } from "react";
import Papa from "papaparse";

function CsvUploader() {
  const [headers, setHeaders] = useState([]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      preview: 1, // only parse the first row
      complete: (results) => {
        setHeaders(results.data[0]); // first row = headers
      },
    });
  };

  return (
    <div className="p-4">
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      {headers.length > 0 && (
        <ul className="mt-4 list-disc list-inside">
          {headers.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CsvUploader;