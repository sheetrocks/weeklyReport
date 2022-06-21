const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

if(!process.env.SR_API_TOKEN) {
    console.log("Error: must supply your SheetRocks API token using the environment variable SR_API_TOKEN");
    process.exit();
}


axios.defaults.headers.common['Authorization'] = `Bearer ${process.env.SR_API_TOKEN}`;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.baseURL = `https://sheet.rocks/api/v1`;

function CreateExampleDataset() {
    const rand = () => Math.round(10*Math.random());
    
    // make a thousand lines of dummy data
    let userData = `username,email,productID,purchase_amount\n`;
    for(var i = 0; i < 1000; i++) {
      userData += `user${rand()},user.name${rand()}@email.com,${rand()},$${rand()}\n`;
    }

    fs.writeFileSync("./weekly_user_stats.csv", userData);
}

async function WeeklyReport() {
    // Create a new workbook
    let res = await axios.post(`/workbook`)
    let workbookId = res.data.workbookId

    // rename the workbook to the current date
    await axios.put(`/workbook/${workbookId}/name?newName=Weekly_Report_${new Date().toLocaleDateString()}`);


    // Import the week's data as a CSV
    const form = new FormData();
    form.append("file", fs.createReadStream('./weekly_user_stats.csv'), "User Stats");

    res = await axios.post(`/workbook/${workbookId}/import/csv`, form, {
      headers: form.getHeaders(),
    });

    let sheetId = res.data.sheetId;

    // Add a simple analysis which calculates the revenue for the week
    await axios.patch(`/workbook/${workbookId}/sheet/${sheetId}`, {Cells: [
        {Row: 0, Col: 5, CellValue: "Weekly Revenue: "},
        {Row: 0, Col: 6, CellValue: "=SUM(D:D)"}
    ]});


    // Add a more advanced analysis, a sorted list of the most valuable customers
    await axios.patch(`/workbook/${workbookId}/sheet/${sheetId}`, {Cells: [
        {Row: 0, Col: 8, CellValue: "username"},
        {Row: 0, Col: 9, CellValue: "revenue ($)"},
        {Row: 1, Col: 8, CellValue: `=SORT(GROUPBY(A:D, "username", "purchase_amount", SUM(GROUP)),2,-1)`},
    ]});

    // grant edit access to someone who needs to view the report
    let email = `my.boss.${Math.round(Math.random() *1e4)}@sheet.rocks`;
    await axios.post(`/workbook/${workbookId}/access`, {
        AccessID: email, 
        AccessLevel: 15, Notify: false});

    console.log(`Report created and shared with ${email}. View at: https://sheet.rocks/workbook/${workbookId}`)
}

CreateExampleDataset();
WeeklyReport();
