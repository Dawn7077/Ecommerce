const Order = require('../../models/orderSchema');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
import StatusCodes from '../../utils/httpStatus';

// Helper function to get date range based on filter type
function getDateRange(filterType, customFrom, customTo) {
    const now = new Date();
    let startDate, endDate;

    switch (filterType) {
        case 'daily':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
            break;
        
        case 'weekly':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
            weekStart.setHours(0, 0, 0, 0);
            startDate = weekStart;
            endDate = new Date();
            break;
        
        case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        
        case 'yearly':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        
        case 'custom':
            if (customFrom && customTo) {
                startDate = new Date(customFrom);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(customTo);
                endDate.setHours(23, 59, 59, 999);
            } else {
                startDate = new Date(0); // Beginning of time
                endDate = new Date(); // Now
            }
            break;
        
        default:
            startDate = new Date(0);
            endDate = new Date();
    }

    return { startDate, endDate };
}

// Helper function to calculate sales statistics
function calculateStatistics(orders) {
    let totalSales = 0;
    let totalDiscount = 0;
    let totalCouponDiscount = 0;
    let totalOrderAmount = 0;

    orders.forEach(order => {
        totalOrderAmount += order.finalAmount;
        totalDiscount += order.discount || 0;
        totalCouponDiscount += order.couponDiscount || 0;
        
        // Net sales after all deductions
        totalSales += order.finalAmount;
    });

    return {
        totalOrders: orders.length,
        totalSales: totalSales.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        totalCouponDiscount: totalCouponDiscount.toFixed(2),
        totalOrderAmount: totalOrderAmount.toFixed(2)
    };
}

const loadSalesReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;

        // Get all completed/paid orders
        const query = {
            paymentStatus: { $in: ['Paid', 'Completed'] },
            status: { $nin: ['Cancelled'] }
        };

        const orders = await Order.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        // Get all orders for statistics (not paginated)
        const allOrders = await Order.find(query);
        const stats = calculateStatistics(allOrders);

        res.render('admin/salesReport', {
            orders,
            stats,
            filterType: 'all',
            from: '',
            to: '',
            currentPage: page,
            totalPages
        });

    } catch (error) {
        console.log("Sales Report Load Error:", error);
        res.redirect("/admin/pageError");
    }
};

const filterSalesReport = async (req, res) => {
    try {
        const { filterType, customFrom, customTo } = req.body;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;

        // Get date range based on filter
        const { startDate, endDate } = getDateRange(filterType, customFrom, customTo);

        // Build query
        const query = {
            paymentStatus: { $in: ['Paid', 'Completed'] },
            status: { $nin: ['Cancelled'] },
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };

        const orders = await Order.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        // Get all filtered orders for statistics
        const allOrders = await Order.find(query);
        const stats = calculateStatistics(allOrders);

        res.render('admin/salesReport', {
            orders,
            stats,
            filterType,
            from: customFrom || '',
            to: customTo || '',
            currentPage: page,
            totalPages
        });

    } catch (error) {
        console.log("Filter Sales Report Error:", error);
        res.redirect("/admin/pageError");
    }
};

const downloadSalesExcel = async (req, res) => {
    try {
        const { filterType, customFrom, customTo } = req.query;

        // Get date range
        const { startDate, endDate } = getDateRange(filterType, customFrom, customTo);

        // Build query
        const query = {
            paymentStatus: { $in: ['Paid', 'Completed'] },
            status: { $nin: ['Cancelled'] },
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };

        const orders = await Order.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        const stats = calculateStatistics(orders);

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Add title
        worksheet.mergeCells('A1:H1');
        worksheet.getCell('A1').value = 'SALES REPORT';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add date range
        worksheet.mergeCells('A2:H2');
        worksheet.getCell('A2').value = `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        // Add summary statistics
        worksheet.addRow([]);
        worksheet.addRow(['Summary Statistics']);
        worksheet.addRow(['Total Orders:', stats.totalOrders]);
        worksheet.addRow(['Total Order Amount:', `₹${stats.totalOrderAmount}`]);
        worksheet.addRow(['Total Discount:', `₹${stats.totalDiscount}`]);
        worksheet.addRow(['Total Coupon Discount:', `₹${stats.totalCouponDiscount}`]);
        worksheet.addRow(['Net Sales:', `₹${stats.totalSales}`]);
        worksheet.addRow([]);

        // Add headers
        const headerRow = worksheet.addRow([
            'Order ID',
            'Date',
            'Customer',
            'Payment Method',
            'Items',
            'Discount',
            'Coupon Discount',
            'Total Amount'
        ]);

        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };

        // Add data
        orders.forEach(order => {
            worksheet.addRow([
                order.orderId,
                new Date(order.createdAt).toLocaleDateString(),
                order.userId?.name || 'Guest',
                order.paymentMethod,
                order.orderedItems.length,
                `₹${order.discount || 0}`,
                `₹${order.couponDiscount || 0}`,
                `₹${order.finalAmount}`
            ]);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 15;
        });

        // Set response headers
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=sales-report-${Date.now()}.xlsx`
        );

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.log("Excel Download Error:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Error generating Excel file");
    }
};

const downloadSalesPDF = async (req, res) => {
    try {
        const { filterType, customFrom, customTo } = req.query;

        // Get date range
        const { startDate, endDate } = getDateRange(filterType, customFrom, customTo);

        // Build query
        const query = {
            paymentStatus: { $in: ['Paid', 'Completed'] },
            status: { $nin: ['Cancelled'] },
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };

        const orders = await Order.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        const stats = calculateStatistics(orders);

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=sales-report-${Date.now()}.pdf`
        );

        doc.pipe(res);

        // Add title
        doc.fontSize(20).font('Helvetica-Bold').text('SALES REPORT', { align: 'center' });
        doc.moveDown();

        // Add date range
        doc.fontSize(12).font('Helvetica')
            .text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 
                { align: 'center' });
        doc.moveDown();

        // Add summary box
        doc.fontSize(14).font('Helvetica-Bold').text('Summary Statistics');
        doc.moveDown(0.5)

        const summaryData = [
            ['Total Orders:', stats.totalOrders],
            ['Total Order Amount:', `₹${stats.totalOrderAmount}`],
            ['Total Discount:', `₹${stats.totalDiscount}`],
            ['Total Coupon Discount:', `₹${stats.totalCouponDiscount}`],
            ['Net Sales:', `₹${stats.totalSales}`]
        ];

        summaryData.forEach(([label, value]) => {
            doc.fontSize(11).font('Helvetica')
                .text(label, 50, doc.y, { continued: true, width: 200 })
                .font('Helvetica-Bold')
                .text(value.toString(), { align: 'right' });
            doc.moveDown(0.3);
        });

        doc.moveDown();

        // Add table header
        doc.fontSize(10).font('Helvetica-Bold');
        const tableTop = doc.y;
        const colWidths = [80, 80, 100, 70, 70, 70, 70];
        const headers = ['Order ID', 'Date', 'Customer', 'Payment', 'Discount', 'Coupon', 'Total'];

        let xPos = 50;
        headers.forEach((header, i) => {
            doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
            xPos += colWidths[i];
        });

        doc.moveDown();
        let yPos = doc.y;

        // Draw line under header
        doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
        yPos += 10;

        // Add table data
        doc.font('Helvetica').fontSize(9);
        orders.forEach((order, index) => {
            if (yPos > 700) { // New page if needed
                doc.addPage();
                yPos = 50;
            }

            xPos = 50;
            const rowData = [
                order.orderId,
                new Date(order.createdAt).toLocaleDateString(),
                (order.userId?.name || 'Guest').substring(0, 15),
                order.paymentMethod,
                `₹${order.discount || 0}`,
                `₹${order.couponDiscount || 0}`,
                `₹${order.finalAmount}`
            ];

            rowData.forEach((data, i) => {
                doc.text(data, xPos, yPos, { width: colWidths[i], align: 'left' });
                if(i===0)xPos += colWidths[i] 
                else xPos += colWidths[i]
                 
            });

            yPos += 20;
        });

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.log("PDF Download Error:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Error generating PDF file");
    }
};

module.exports = {
    loadSalesReport,
    filterSalesReport,
    downloadSalesExcel,
    downloadSalesPDF
};