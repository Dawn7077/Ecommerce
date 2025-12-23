const Order = require('../../models/orderSchema')
const PDFDocument = require('pdfkit')
const ExcelJS = require('exceljs')



//calculating all orders stats for Sales Report
function calculateStats1(orders) {
    let totalSales = 0
    let totalDiscount = 0
    let totalCouponDiscount = 0 
    let totalOrderAmount = 0 
    let deliveredOrdersCount = 0;

    orders.forEach(order=>{
        totalOrderAmount += order.finalAmount
        totalDiscount += order.discount || 0
        totalCouponDiscount += order.couponDiscount || 0

        totalSales += order.finalAmount
    })

    return {
        totalOrders :orders.length,
        totalSales:totalSales.toFixed(2),
        totalDiscount:totalDiscount.toFixed(2),
        totalCouponDiscount:totalCouponDiscount.toFixed(2),
        totalOrderAmount:totalOrderAmount.toFixed(2),
    }
}


function calculateStats2(orders) {
    let totalSales = 0
    let totalDiscount = 0
    let totalCouponDiscount = 0 
    let totalOrderAmount = 0 
    let deliveredOrdersCount = 0;

    orders.forEach(order=>{
        let orderHasDeliveredItem = false
        let orderDeliveredAmount = 0 
        let orderDeliveredDiscount = 0 
        
        order.orderedItems.forEach(item => {
            if(item.status === 'Delivered'){
                orderHasDeliveredItem =true

                const itemPrice = item.price * item.quantity
                orderDeliveredAmount += itemPrice

                if(order.subtotal > 0){
                    const itemProportion = itemPrice / order.subtotal
                    orderDeliveredDiscount += (order.discount || 0 ) * itemProportion
                }
            }
        })
        //only counting the orders that have at least one delivered item 
        if(orderHasDeliveredItem){
            deliveredOrdersCount ++ 
            totalOrderAmount += orderDeliveredAmount
            totalDiscount += orderDeliveredDiscount

            if(order.couponApplied && order.subtotal > 0 ){
                const deliveredProportion = orderDeliveredAmount / order.subtotal
                totalCouponDiscount += (order.couponDiscount || 0) * deliveredProportion
            }
            // Final sales = amount - discount - coupon
            totalSales += orderDeliveredAmount - orderDeliveredDiscount -
                (order.couponApplied ? (order.couponDiscount || 0) * (orderDeliveredAmount/order.subtotal) : 0)
        }
        
    })

    return {
        totalOrders :orders.length,
        totalSales:totalSales.toFixed(2),
        totalDiscount:totalDiscount.toFixed(2),
        totalCouponDiscount:totalCouponDiscount.toFixed(2),
        totalOrderAmount:totalOrderAmount.toFixed(2),
    }
}
//for all orders 
function calculateStats(orders) {
    let totalSales = 0;
    let totalDiscount = 0;
    let totalCouponDiscount = 0;
    let totalOrderAmount = 0;
    let deliveredOrdersCount = new Set();  

    orders.forEach(order => {
        let orderDeliveredAmount = 0;
 
        order.orderedItems.forEach(item => {
            if (item.status === 'Delivered') {
                const itemTotal = item.price * item.quantity;
                orderDeliveredAmount += itemTotal;
                deliveredOrdersCount.add(order._id.toString()); 
            }
        });
 
        if (orderDeliveredAmount > 0) {
            totalOrderAmount += orderDeliveredAmount;
 
            if ( (order.subtotal || 0) > 0) {
                const proportion = orderDeliveredAmount / order.subtotal;
                const orderDiscount = (order.discount || 0) * proportion;
                const orderCouponDiscount = order.couponApplied ? (order.couponDiscount || 0) * proportion : 0;

                totalDiscount += orderDiscount;
                totalCouponDiscount += orderCouponDiscount;
 
                totalSales += orderDeliveredAmount - orderDiscount - orderCouponDiscount;
            } else { 
                totalSales += orderDeliveredAmount;
            }
        }
    });

    return {
        totalOrders: deliveredOrdersCount.size,
        totalSales: totalSales.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        totalCouponDiscount: totalCouponDiscount.toFixed(2),
        totalOrderAmount: totalOrderAmount.toFixed(2),
    };
}

function calculateOrderNetAmount(order) {
    let deliveredAmount = 0 
    order.orderedItems.forEach(item =>{
        if(item.status === 'Delivered'){
            deliveredAmount += item.price * item.quantity
        }
    })

    if(deliveredAmount === 0 || (order.subtotal || 0)===0){
        return 0 
    }

    const proportion = deliveredAmount/ order.subtotal
    const discount = (order.discount || 0) * proportion
    const coupon = order.couponApplied? 
        ( order.couponDiscount|| 0) * proportion :0

    return +(deliveredAmount - discount -coupon).toFixed(2)
}


function getDateRange(filterType,customFrom,customTo) {
    const now = new Date()
    let startDate,endDate
    switch(filterType){
        case 'daily':
            startDate = new Date(now.setHours(0,0,0,0));
            endDate = new Date(now.setHours(23,59,59,999));
            break;

        case 'weekly':
            const weekStart = new Date(now)
            weekStart.setDate(now.getDate()-now.getDay())
            weekStart.setHours(0,0,0,0)
            startDate = weekStart
            endDate = new Date()
            break;

        case 'monthly':
            startDate= new Date(now.getFullYear(),now.getMonth(),1)
            endDate = new Date(now.getFullYear(),now.getMonth()+1,0, 23, 59, 59, 999)
            break;

        case 'yearly':
            startDate= new Date(now.getFullYear(),0,1)
            endDate = new Date(now.getFullYear(),11,31,23, 59, 59, 999)
            break;

        case 'custom':
            if (customFrom && customTo) {
                startDate= new Date(customFrom)
                startDate.setHours(0,0,0,0)
                endDate= new Date(customTo) 
                endDate.setHours(23,59,59,999) 
            }else{
                startDate= new Date(0)
                endDate= new Date()
            }
            break;
        
        case 'all':
            startDate = new Date(0)
            endDate = new Date()
            break;
        
        default:
            startDate = new Date(0)
            endDate= new Date()
    }

    return { startDate,endDate }
}
const loadSalesReport = async(req,res)=>{
    try {
        const page =  parseInt(req.query.page) || 1;
        const limit = 10;

        const query = {
            status: { $nin: ['Cancelled','Returned'] },
            paymentStatus: { $in: ['Paid', 'Completed'] },
        }

        const rawOrders = await Order.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

        const orders = rawOrders.map(order => ({
            ...order.toObject(),
            deliveredNetAmount: calculateOrderNetAmount(order)
        }));


        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        const allOrders = await Order.find(query)
        //---
        const stats = calculateStats(allOrders)

        return res.render('admin/salesReport',{
            orders,
            stats,
            filterType:'All',
            from:'',
            to:'',
            currentPage:page,
            totalPages
        })

    } catch (error) {
        console.log("Sales Report Load Error:", error);
        res.redirect("/admin/pageError"); 
    }
}
const filterSalesReport =  async(req,res)=>{
    try {
        const {filterType,customFrom,customTo}= req.body
        const page = parseInt(req.query.page) || 1
        const limit =10 
        const {startDate, endDate}= getDateRange(filterType, customFrom, customTo)

        const query ={
            status: { $nin: ['Cancelled','Returned'] },
            paymentStatus:{$in:['Paid','Completed']},
            createdAt:{
                $gte:startDate,
                $lte:endDate
            }
        }

        const rawOrders = await Order.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

        const orders = rawOrders.map(order => ({
            ...order.toObject(),
            deliveredNetAmount: calculateOrderNetAmount(order)
        }));


        const totalOrders = await Order.countDocuments(query)
        const totalPages = Math.ceil(totalOrders/limit)

        const allOrders = await Order.find(query)
        const stats = calculateStats(allOrders)

        res.render('admin/salesReport',{
            orders,
            stats,
            filterType,
            from:customFrom || '',
            to:customTo || '',
            currentPage:page,
            totalPages
        })

    } catch (error) {
        console.log("Filter Sales Report Error:", error);
        res.redirect("/admin/pageError");
    }
}
const downloadSalesExcel = async (req,res)=>{
    try {
        const { filterType, customFrom, customTo } = req.query 

        const { startDate, endDate } = getDateRange(filterType, customFrom, customTo)
        
        const query = {
            status: { $nin: ['Cancelled','Returned'] },
            paymentStatus: { $in: ['Paid', 'Completed'] },
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        } 

        const rawOrders = await Order.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt:-1 });

        const orders = rawOrders.map(order => ({
            ...order.toObject(),
            deliveredNetAmount: calculateOrderNetAmount(order)
        }));

 
        const stats = calculateStats(orders);

        //workbook- excel tab and excel work page 
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Sales Report')
        //heading
        worksheet.mergeCells('A1:H1');
        worksheet.getCell('A1').value = 'SALES REPORT';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        //date
        worksheet.mergeCells('A2:H2');
        worksheet.getCell('A2').value = `Date: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        //summary part
        worksheet.addRow([]); 
        worksheet.addRow(['Summary Statistics']);
        worksheet.addRow(['Total Orders:', stats.totalOrders]);
        worksheet.addRow(['Total Order Amount:', `₹${stats.totalOrderAmount}`]);
        worksheet.addRow(['Total Discount:', `₹${stats.totalDiscount}`]);
        worksheet.addRow(['Total Coupon Discount:', `₹${stats.totalCouponDiscount}`]);
        worksheet.addRow(['Net Sales:', `₹${stats.totalSales}`]);
        worksheet.addRow([]);

        //table header row
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
        //table data for each row 
        orders.forEach(order=>{
            worksheet.addRow([
                order.orderId,
                new Date(order.createdAt).toLocaleDateString(),
                order.userId.name,
                order.paymentMethod,
                order.orderedItems.length,
                `₹${order.discount || 0}`,
                `₹${order.couponDiscount || 0}`,
                `₹${order.deliveredNetAmount}`
            ])
        })

        worksheet.columns.forEach(column=>{
            column.width =15
        })

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=sales-report-${Date.now()}.xlsx`
        );

        await workbook.xlsx.write(res)
        res.end() 

    } catch (error) {
        console.log("Excel Download Error:", error);
        res.status(500).send("Error generating Excel file");
    }
}
const downloadSalesPDF = async (req,res) => {
    try { 
        const { filterType, customFrom, customTo } = req.query; 

        const { startDate, endDate } = getDateRange(filterType, customFrom, customTo);

        const query = {
            status: { $nin: ['Cancelled','Returned'] },
            paymentStatus: { $in: ['Paid', 'Completed'] },
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };

        const rawOrders = await Order.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 });

        const orders = rawOrders.map(order => ({
            ...order.toObject(),
            deliveredNetAmount: calculateOrderNetAmount(order)
        }));



        const stats = calculateStats(orders);

        const doc = new PDFDocument({margin:50})

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=sales-report-${Date.now()}.pdf`
        );

        doc.pipe(res);
        //title for the pdf
        doc.fontSize(20).font('Helvetica-Bold').text('SALES REPORT', { align: 'center' });
        doc.moveDown();

        //date range
        doc.fontSize(12).font('Helvetica')
        .text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 
            { align: 'center' })
        doc.moveDown()

        //summary
        doc.fontSize(14).font('Helvetica-Bold').text('Summary Statistics');
        doc.moveDown(0.5)

        const summaryData = [
            ['Total Orders:', stats.totalOrders],
            ['Total Order Amount:', `${stats.totalOrderAmount}`],
            ['Total Discount:', `${stats.totalDiscount}`],
            ['Total Coupon Discount:', `${stats.totalCouponDiscount}`],
            ['Net Sales:', `${stats.totalSales}`]
        ]

        summaryData.forEach(([label, value]) => {
            doc.fontSize(11).font('Helvetica')
                .text(label, 50, doc.y, { continued: true, width: 200 })
                .font('Helvetica-Bold')
                .text(value.toString(), { align: 'right' });
            doc.moveDown(0.3);
        })

        doc.moveDown()

        //table header
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

        //  line under header
        doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
        yPos += 10;

        // Adding table data
        doc.font('Helvetica').fontSize(9);
        orders.forEach((order, index) => {
            if (yPos > 700) {  
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
                `₹${order.deliveredNetAmount}`

            ];

            rowData.forEach((data, i) => {
                doc.text(data, xPos, yPos, { width: colWidths[i], align: 'left' });
                xPos += colWidths[i];
            });

            yPos += 20;
        });

        doc.end(); 

    } catch (error) {
        console.log("PDF Download Error:", error);
        res.status(500).send("Error generating PDF file");
    }
}


 




module.exports = {
    loadSalesReport,
    filterSalesReport,
    downloadSalesExcel,
    downloadSalesPDF
}