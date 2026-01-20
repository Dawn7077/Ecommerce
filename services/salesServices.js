




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

export {
    calculateOrderNetAmount,
    calculateStats,
    getDateRange
}