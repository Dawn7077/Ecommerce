import Order from '../../models/orderSchema.js'
import PDFDocument from 'pdfkit' 
import ExcelJS from 'exceljs' 
import StatusCodes from '../../utils/httpStatus.js';



//calculating all orders stats for Sales Report
 
function getSalesBaseQuery() {
    return {
        $or: [
            { paymentStatus: { $in: ['Paid', 'Completed'] } },
            { paymentMethod: { $in: ['Wallet', 'Stripe'] } },
            { status: 'Delivered' }
        ]
    };
}

// const query = {
//     createdAt: { $gte: startDate, $lte: endDate },
//     ...getSalesBaseQuery()
// };
 

function calculateStats3(orders) {
    let totalSales = 0;
    let totalOrderAmount = 0;
    let totalCancelled = 0;
    let totalRefunded = 0;
    let totalOrdersCount = 0;
    let deliveredOrdersCount = new Set();  

    orders.forEach(order => {
        const netAmount = calculateOrderNetAmount(order);
        if (netAmount > 0) {
            totalSales += netAmount;
            totalOrderAmount += netAmount;
            totalOrdersCount++;
        }
 
        const paidRatio = order.finalAmount / (order.subtotal || 1);
        order.orderedItems.forEach(item => {
            const itemActualValue = item.price * item.quantity * paidRatio;
            if (item.status === 'Cancelled') totalCancelled += itemActualValue;
            if (item.refunded) totalRefunded += itemActualValue;
        });
    });

    return {
        totalOrders: totalOrdersCount,
        totalSales: totalSales.toFixed(2),
        totalOrderAmount: totalOrderAmount.toFixed(2),
        totalCancelled: totalCancelled.toFixed(2),
        totalRefunded: totalRefunded.toFixed(2)
    };
}

function calculateOrderNetAmount3(order) {
    const deliveredItemsAmount = order.orderedItems
        .filter(item => item.status === 'Delivered')
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (deliveredItemsAmount === 0) return 0;

    const totalPossibleAmount = order.orderedItems
        .filter(item => item.status !== 'Cancelled')
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (deliveredItemsAmount === totalPossibleAmount) {
        return +order.finalAmount.toFixed(2);
    }
    
    const ratio = order.finalAmount / (order.subtotal || 1);
    return +(deliveredItemsAmount * ratio).toFixed(2);

}

//for all orders 

function calculateOrderNetAmount(order) { 
    const activeItemsTotal = order.totalPrice || 1; 
    const couponRatio = (order.couponDiscount || 0) / activeItemsTotal;

    let netAmount = 0;
    const isPrepaid = ['Wallet', 'Stripe'].includes(order.paymentMethod);
    order.orderedItems.forEach(item => {
        const isSold =(isPrepaid && ['Paid', 'Completed'].includes(order.paymentStatus)) || item.status === 'Delivered';

        // if (isSold && !item.refunded && item.status !== 'Cancelled') {
        if (isSold && !item.refunded ) {
            const itemBaseValue = item.price * item.quantity;
            const itemCouponShare = itemBaseValue * couponRatio;
            netAmount += (itemBaseValue - itemCouponShare);
        }
    });

    // Add shipping only if at least one item is delivered and kept
    // if (netAmount > 0) {
    if (netAmount > 0 && order.finalAmount > 0) {
        const shipping = (order.finalAmount - (order.totalPrice - order.couponDiscount));
        netAmount += shipping;
    }

    return +netAmount.toFixed(2);
}

function calculateStats(orders) {
    let stats = {
        totalOrders: 0,
        totalSales: 0,
        totalOrderAmount: 0,
        totalCancelled: 0,
        totalRefunded: 0,
        totalDiscount: 0, // Product/Category offers
        totalCouponDiscount: 0
    };

    orders.forEach(order => {
        const orderNet = calculateOrderNetAmount(order);
        if (orderNet > 0) {
            stats.totalOrders++;
            stats.totalSales += orderNet;
        }

        //  whole system stats
        stats.totalDiscount += (order.discount || 0);
        stats.totalCouponDiscount += (order.couponDiscount || 0);
        stats.totalOrderAmount += (order.finalAmount || 0);

        // Calculate item-wise cancelled/refunded amounts
        const activeItemsTotal = order.totalPrice || 1;
        const couponRatio = (order.couponDiscount || 0) / activeItemsTotal;

        order.orderedItems.forEach(item => {
            const itemBaseValue = item.price * item.quantity;
            const itemCouponShare = itemBaseValue * couponRatio;
            const itemActualPaidValue = itemBaseValue - itemCouponShare;

            if (item.status === 'Cancelled') {
                stats.totalCancelled += itemActualPaidValue;
            }
            if (item.refunded) {
                stats.totalRefunded += itemActualPaidValue;
            }
        });
    });

    // Format all to fixed(2)
    for (let key in stats) {
        if (key !== 'totalOrders') stats[key] = stats[key].toFixed(2);
    }
    return stats;
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
            $or: [
                { paymentStatus: 'Paid' },
                { paymentStatus: 'Completed' },
                { paymentMethod: { $in: ['Wallet', 'Stripe'] } },
                { status: 'Delivered' }
            ]
            
        }

        const rawOrders = await Order.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
// *******
    const orders = rawOrders.map(order => {
    let itemRefunded = 0;
    let itemCancelled = 0;
    
    // Calculate the share of coupon for this specific item
    const activeItemsTotal = order.totalPrice || 1;
    const couponRatio = (order.couponDiscount || 0) / activeItemsTotal;

    order.orderedItems.forEach(item => {
        const itemBaseValue = item.price * item.quantity;
        const itemActualValue = itemBaseValue - (itemBaseValue * couponRatio);

        if (item.refunded) {
            itemRefunded += itemActualValue;
        } else if (item.status === 'Cancelled') {
            itemCancelled += itemActualValue;
        }
    });

    return {
        ...order.toObject(),
        deliveredNetAmount: calculateOrderNetAmount(order),
        totalCancelled: +itemCancelled.toFixed(2),
        totalRefunded: +itemRefunded.toFixed(2)
    };
});
// *******


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

        const query = {
            createdAt: { $gte: startDate, $lte: endDate },
            $or: [
                { paymentStatus: { $in: ['Paid', 'Completed'] } },
                { paymentMethod: { $in: ['Wallet', 'Stripe'] } },
                { status: 'Delivered' }
            ]
        };

        const rawOrders = await Order.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

        // *******
        const orders = rawOrders.map(order => {
            const paidRatio = order.finalAmount / (order.subtotal || 1);
            let totalCancelled  = 0
            let totalRefunded  = 0

            order.orderedItems.forEach(item => {
                const itemTotal = item.price * item.quantity * paidRatio;

                if(item.status === 'Cancelled') totalCancelled += itemTotal;
                if(item.refunded) totalRefunded += itemTotal;
            });

            return {
                ...order.toObject(),
                deliveredNetAmount: calculateOrderNetAmount(order),
                totalCancelled: +totalCancelled.toFixed(2),
                totalRefunded: +totalRefunded.toFixed(2)
            };
        });
        
        // *******


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

        //==================
        const orders = rawOrders.map(order => {
            const netAmount = calculateOrderNetAmount(order); 
            
             
            const activeItemsTotal = order.totalPrice || 1;
            const couponRatio = (order.couponDiscount || 0) / activeItemsTotal;
            let itemRefunded = 0;
            let itemCancelled = 0;

            order.orderedItems.forEach(item => {
                const itemActualValue = (item.price * item.quantity) * (1 - couponRatio);
                if (item.refunded) itemRefunded += itemActualValue;
                else if (item.status === 'Cancelled') itemCancelled += itemActualValue;
            });

            return {
                ...order.toObject(),
                deliveredNetAmount: netAmount,
                totalCancelled: +itemCancelled.toFixed(2),
                totalRefunded: +itemRefunded.toFixed(2)
            };
        });
        //==================

 
        const stats = calculateStats(orders);

        //workbook- excel tab and excel work page 
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Sales Report')
        //heading
        worksheet.mergeCells('A1:J1'); 
        worksheet.getCell('A1').value = 'SALES REPORT';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        //date
        worksheet.mergeCells('A2:J2');
        worksheet.getCell('A2').value = `Date: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        //summary part
        worksheet.addRow([]); 
        worksheet.addRow(['Summary Statistics']);
        worksheet.addRow(['Total Orders:', stats.totalOrders]);
        worksheet.addRow(['Total Order Amount:', `₹${stats.totalOrderAmount}`]);
        worksheet.addRow(['Total Discount:', `₹${stats.totalDiscount}`]);
        worksheet.addRow(['Total Coupon Discount:', `₹${stats.totalCouponDiscount}`]);
        worksheet.addRow(['Total Cancelled:', `₹${stats.totalCancelled}`]);
        worksheet.addRow(['Total Refunded:', `₹${stats.totalRefunded}`]);
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
            'Cancelled Amount',
            'Refunded Amount',
            'Net Sales'
        ]);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };
        //table data for each row 
        orders.forEach(order => {
            worksheet.addRow([
                order.orderId,
                new Date(order.createdAt).toLocaleDateString(),
                order.userId?.name || 'Guest',
                order.paymentMethod,
                order.orderedItems.length,
                `₹${order.discount || 0}`,
                `₹${order.couponDiscount || 0}`,
                `₹${order.totalCancelled || 0}`,
                `₹${order.totalRefunded || 0}`,
                `₹${order.deliveredNetAmount}`
            ]);
        });

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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Error generating Excel file");
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

        const orders = rawOrders.map(order => {
            const netAmount = calculateOrderNetAmount(order); 
            
             
            const activeItemsTotal = order.totalPrice || 1;
            const couponRatio = (order.couponDiscount || 0) / activeItemsTotal;
            let itemRefunded = 0;
            let itemCancelled = 0;

            order.orderedItems.forEach(item => {
                const itemActualValue = (item.price * item.quantity) * (1 - couponRatio);
                if (item.refunded) itemRefunded += itemActualValue;
                else if (item.status === 'Cancelled') itemCancelled += itemActualValue;
            });

            return {
                ...order.toObject(),
                deliveredNetAmount: netAmount,
                totalCancelled: +itemCancelled.toFixed(2),
                totalRefunded: +itemRefunded.toFixed(2)
            };
        });



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
            ['Total Cancelled:', `₹${stats.totalCancelled}`],
            ['Total Refunded:', `₹${stats.totalRefunded}`],
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
        const colWidths = [75, 65, 90, 60, 55, 55, 55, 55, 55];
        const headers = [
            'Order ID',
            'Date',
            'Customer',
            'Payment',
            'Discount',
            'Coupon',
            'Cancelled',
            'Refunded',
            'Net'
        ];
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
                (order.userId?.name || 'Guest').substring(0, 12),
                order.paymentMethod,
                `₹${order.discount || 0}`,
                `₹${order.couponDiscount || 0}`,
                `₹${order.totalCancelled || 0}`,
                `₹${order.totalRefunded || 0}`,
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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Error generating PDF file");
    }
}


 




export {
    loadSalesReport,
    filterSalesReport,
    downloadSalesExcel,
    downloadSalesPDF
}