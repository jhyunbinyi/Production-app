import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [data, setData] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('All');
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    const fetchDataForAllDays = async () => {
      const allData = {};
      for (const day of days) {
        try {
          const res = await fetch(`http://localhost:5000/recommendations/${day}`);
          if (!res.ok) {
            throw new Error("Network response was not ok");
          }
          const dayData = await res.json();
          allData[day] = dayData;
        } catch (error) {
          console.error(`Error fetching data for ${day}:`, error);
        }
      }
      setData(allData);
    };

    fetchDataForAllDays();
  }, []);

  const downloadCSV = () => {
    const headers = selectedDay === 'All'
      ? ['Item Name', ...days.map(day => `${day} Recommended Production`)]
      : ['Item Name', `${selectedDay} Recommended Production`];

    const csvRows = [];

    const items = [...new Set(data[days[0]]?.map((item: any) => item['Item Name']))];

    csvRows.push(headers.join(','));

    items.forEach(item => {
      const row = [item];
      if (selectedDay === 'All') {
        days.forEach(day => {
          const record = data[day]?.find((d: any) => d['Item Name'] === item);
          row.push(record ? record['Recommended Production'] : '');
        });
      } else {
        const record = data[selectedDay]?.find((d: any) => d['Item Name'] === item);
        row.push(record ? record['Recommended Production'] : '');
      }
      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `production_recommendations_${selectedDay === 'All' ? 'all_days' : selectedDay}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container">
      <h1>Production Recommendations</h1>

      <label htmlFor="day-select">Choose a day:</label>
      <select
        id="day-select"
        value={selectedDay}
        onChange={(e) => setSelectedDay(e.target.value)}
      >
        <option value="All">All</option>
        {days.map(day => (
          <option key={day} value={day}>{day}</option>
        ))}
      </select>

      <button onClick={downloadCSV}>Download as CSV</button>

      {Object.keys(data).length === 0 ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              {selectedDay === 'All' 
                ? days.map(day => (
                    <th key={day}>{day} Recommended Production</th>
                  ))
                : <th>{selectedDay} Recommended Production</th>
              }
            </tr>
          </thead>
          <tbody>
            {[...new Set(data[days[0]]?.map((item: any) => item['Item Name']))].map((item, index) => (
              <tr key={index}>
                <td>{item}</td>
                {selectedDay === 'All' 
                  ? days.map(day => {
                      const record = data[day]?.find((d: any) => d['Item Name'] === item);
                      return <td key={day}>{record ? record['Recommended Production'] : ''}</td>;
                    })
                  : (() => {
                      const record = data[selectedDay]?.find((d: any) => d['Item Name'] === item);
                      return <td>{record ? record['Recommended Production'] : ''}</td>;
                    })()
                }
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
