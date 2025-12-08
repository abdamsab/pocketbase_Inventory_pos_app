import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportData {
    headers: string[];
    rows: any[][];
    filename: string;
    title?: string;
}

export const exportToExcel = (data: ExportData) => {
    const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');

    // Auto-size columns
    const maxWidth = data.headers.map((h, i) => {
        const headerWidth = h.length;
        const dataWidth = Math.max(...data.rows.map(r => String(r[i] || '').length));
        return Math.max(headerWidth, dataWidth, 10);
    });

    ws['!cols'] = maxWidth.map(w => ({ wch: w + 2 }));

    XLSX.writeFile(wb, `${data.filename}.xlsx`);
};

export const exportToCSV = (data: ExportData) => {
    const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${data.filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToPDF = (data: ExportData) => {
    const doc = new jsPDF();

    // Add title
    if (data.title) {
        doc.setFontSize(16);
        doc.text(data.title, 14, 15);
    }

    // Add table
    autoTable(doc, {
        head: [data.headers],
        body: data.rows,
        startY: data.title ? 25 : 15,
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [99, 102, 241], // Primary color
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
    });

    doc.save(`${data.filename}.pdf`);
};

export const exportData = (data: ExportData, format: 'excel' | 'csv' | 'pdf') => {
    switch (format) {
        case 'excel':
            exportToExcel(data);
            break;
        case 'csv':
            exportToCSV(data);
            break;
        case 'pdf':
            exportToPDF(data);
            break;
    }
};
