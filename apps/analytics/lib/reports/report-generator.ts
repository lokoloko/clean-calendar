import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

interface PropertyData {
  name: string
  revenue: number
  fees: number
  net: number
  nightsBooked: number
  occupancyRate: number
  healthScore: number
  status: 'healthy' | 'warning' | 'critical'
  insights?: string[]
}

interface ReportData {
  month: string
  totalRevenue: number
  totalFees: number
  totalNet: number
  activeProperties: number
  inactiveProperties: number
  properties: PropertyData[]
  insights: string[]
}

export class ReportGenerator {
  static async generatePDF(data: ReportData): Promise<Blob> {
    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 20
    let yPosition = margin

    // Title
    pdf.setFontSize(24)
    pdf.setTextColor(33, 37, 41)
    pdf.text('Airbnb Portfolio Analytics Report', margin, yPosition)
    yPosition += 15

    // Subtitle with month
    pdf.setFontSize(14)
    pdf.setTextColor(108, 117, 125)
    pdf.text(`${data.month} Performance Report`, margin, yPosition)
    yPosition += 10

    // Generated date
    pdf.setFontSize(10)
    pdf.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, margin, yPosition)
    yPosition += 15

    // Summary Section
    pdf.setFontSize(16)
    pdf.setTextColor(33, 37, 41)
    pdf.text('Executive Summary', margin, yPosition)
    yPosition += 10

    // Summary metrics
    pdf.setFontSize(11)
    pdf.setTextColor(73, 80, 87)
    const summaryText = [
      `Total Revenue: $${data.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `Service Fees: $${data.totalFees.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `Net Income: $${data.totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `Active Properties: ${data.activeProperties} / ${data.properties.length}`,
      `Inactive Properties: ${data.inactiveProperties} properties requiring attention`
    ]

    summaryText.forEach(text => {
      pdf.text(text, margin + 5, yPosition)
      yPosition += 7
    })
    yPosition += 10

    // Key Insights
    pdf.setFontSize(16)
    pdf.setTextColor(33, 37, 41)
    pdf.text('Key Insights', margin, yPosition)
    yPosition += 10

    pdf.setFontSize(10)
    pdf.setTextColor(73, 80, 87)
    data.insights.forEach(insight => {
      const lines = pdf.splitTextToSize(`• ${insight}`, pageWidth - (margin * 2))
      lines.forEach((line: string) => {
        if (yPosition > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage()
          yPosition = margin
        }
        pdf.text(line, margin + 5, yPosition)
        yPosition += 6
      })
    })
    yPosition += 10

    // Property Details
    pdf.addPage()
    yPosition = margin
    pdf.setFontSize(16)
    pdf.setTextColor(33, 37, 41)
    pdf.text('Property Performance Details', margin, yPosition)
    yPosition += 10

    // Table headers
    pdf.setFontSize(10)
    pdf.setTextColor(108, 117, 125)
    const columns = ['Property', 'Revenue', 'Nights', 'Occupancy', 'Health', 'Status']
    const columnWidths = [50, 30, 20, 25, 20, 25]
    let xPosition = margin

    columns.forEach((col, i) => {
      pdf.text(col, xPosition, yPosition)
      xPosition += columnWidths[i]
    })
    yPosition += 8

    // Table data
    pdf.setTextColor(73, 80, 87)
    const sortedProperties = [...data.properties].sort((a, b) => b.revenue - a.revenue)
    
    sortedProperties.forEach(property => {
      if (yPosition > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage()
        yPosition = margin
        // Repeat headers
        pdf.setTextColor(108, 117, 125)
        xPosition = margin
        columns.forEach((col, i) => {
          pdf.text(col, xPosition, yPosition)
          xPosition += columnWidths[i]
        })
        yPosition += 8
        pdf.setTextColor(73, 80, 87)
      }

      xPosition = margin
      const rowData = [
        property.name.substring(0, 20),
        `$${property.revenue.toLocaleString()}`,
        property.nightsBooked.toString(),
        `${property.occupancyRate}%`,
        property.healthScore.toString(),
        property.status
      ]

      // Color code based on status
      if (property.status === 'critical') {
        pdf.setTextColor(220, 53, 69)
      } else if (property.status === 'warning') {
        pdf.setTextColor(255, 193, 7)
      } else {
        pdf.setTextColor(40, 167, 69)
      }

      rowData.forEach((data, i) => {
        pdf.text(data, xPosition, yPosition)
        xPosition += columnWidths[i]
      })
      pdf.setTextColor(73, 80, 87)
      yPosition += 7
    })

    // Return as blob
    return pdf.output('blob')
  }

  static async generateExcel(data: ReportData): Promise<Blob> {
    const workbook = XLSX.utils.book_new()

    // Summary sheet
    const summaryData = [
      ['Airbnb Portfolio Analytics Report'],
      [`${data.month} Performance`],
      [`Generated: ${format(new Date(), 'MMMM d, yyyy')}`],
      [],
      ['Executive Summary'],
      ['Metric', 'Value'],
      ['Total Revenue', data.totalRevenue],
      ['Service Fees', data.totalFees],
      ['Net Income', data.totalNet],
      ['Active Properties', data.activeProperties],
      ['Inactive Properties', data.inactiveProperties],
      ['Total Properties', data.properties.length],
      [],
      ['Key Insights'],
      ...data.insights.map(insight => [insight])
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    
    // Style the summary sheet
    summarySheet['!cols'] = [
      { wch: 30 },
      { wch: 20 }
    ]
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // Properties sheet
    const propertiesData = [
      ['Property Performance Details'],
      [],
      ['Property Name', 'Gross Revenue', 'Service Fees', 'Net Income', 'Nights Booked', 'Occupancy Rate', 'Health Score', 'Status', 'Category']
    ]

    const sortedProperties = [...data.properties].sort((a, b) => b.revenue - a.revenue)
    
    sortedProperties.forEach(property => {
      propertiesData.push([
        property.name,
        property.revenue,
        property.fees,
        property.net,
        property.nightsBooked,
        `${property.occupancyRate}%`,
        property.healthScore,
        property.status.toUpperCase(),
        property.revenue > 0 ? 'Active' : 'Inactive'
      ])
    })

    // Add totals row
    propertiesData.push([])
    propertiesData.push([
      'TOTALS',
      data.totalRevenue,
      data.totalFees,
      data.totalNet,
      sortedProperties.reduce((sum, p) => sum + p.nightsBooked, 0),
      '',
      '',
      '',
      ''
    ])

    const propertiesSheet = XLSX.utils.aoa_to_sheet(propertiesData)
    
    // Style the properties sheet
    propertiesSheet['!cols'] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 }
    ]

    XLSX.utils.book_append_sheet(workbook, propertiesSheet, 'Properties')

    // Analytics sheet
    const analyticsData = [
      ['Property Analytics'],
      [],
      ['Category', 'Count', 'Percentage', 'Total Revenue', 'Average Revenue']
    ]

    const activeProps = data.properties.filter(p => p.revenue > 0)
    const inactiveProps = data.properties.filter(p => p.revenue === 0)
    
    analyticsData.push([
      'Active Properties',
      activeProps.length,
      `${((activeProps.length / data.properties.length) * 100).toFixed(1)}%`,
      activeProps.reduce((sum, p) => sum + p.revenue, 0),
      activeProps.length > 0 ? activeProps.reduce((sum, p) => sum + p.revenue, 0) / activeProps.length : 0
    ])

    analyticsData.push([
      'Inactive Properties',
      inactiveProps.length,
      `${((inactiveProps.length / data.properties.length) * 100).toFixed(1)}%`,
      0,
      0
    ])

    analyticsData.push([])
    analyticsData.push(['Health Score Distribution'])
    analyticsData.push(['Category', 'Count', 'Properties'])
    
    const healthy = data.properties.filter(p => p.status === 'healthy')
    const warning = data.properties.filter(p => p.status === 'warning')
    const critical = data.properties.filter(p => p.status === 'critical')

    analyticsData.push([
      'Healthy (70-100)',
      healthy.length,
      healthy.map(p => p.name).join(', ')
    ])

    analyticsData.push([
      'Warning (40-69)',
      warning.length,
      warning.map(p => p.name).join(', ')
    ])

    analyticsData.push([
      'Critical (0-39)',
      critical.length,
      critical.map(p => p.name).join(', ')
    ])

    const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsData)
    
    analyticsSheet['!cols'] = [
      { wch: 20 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 }
    ]

    XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Analytics')

    // Generate Excel file as array buffer and convert to blob
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }

  static downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}