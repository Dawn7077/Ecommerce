
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
        totalDiscount: 0,  
        totalCouponDiscount: 0
    };

    orders.forEach(order => {
        const orderNet = calculateOrderNetAmount(order);
        if (orderNet > 0) {
            stats.totalOrders++;
            stats.totalSales += orderNet;
        }
 
        stats.totalDiscount += (order.discount || 0);
        stats.totalCouponDiscount += (order.couponDiscount || 0);
        stats.totalOrderAmount += (order.finalAmount || 0);
 
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
 
    for (let key in stats) {
        if (key !== 'totalOrders') stats[key] = stats[key].toFixed(2);
    }
    return stats;
}
function getDateFilter(type,value){
    let start,end
    const now = new Date()

    if(value){
        if(type === 'yearly'){
            start = new Date(value,0,1,0,0,0)
            end = new Date(value,11,31,23,59,59)
        }

        else if(type === 'monthly'){
            const year = now.getFullYear()
            start = new Date(year,value-1,1,0,0,0)
            end = new Date(year,value,0,23,59,59)
        }else{ 
            start = new Date()
            end = new Date()
            start.setDate(end.getDate()- 30)
        } 
    }else{
        if (type === 'daily') {
            start = new Date(now)
            start.setHours(0,0,0,0)

            end = new Date(now)
            end.setHours(23,59,59,999)
        }

        else if (type === 'monthly') { 
            start = new Date(now.getFullYear(),now.getMonth(),1)
            end = new Date(now.getFullYear(),now.getMonth() + 1,0,23,59,59,999)
        }

        else if (type === 'yearly') {
            start = new Date(now.getFullYear(),0,1)
            end = new Date(now.getFullYear(),11,31,23,59,59,999)
        }

        else { 
            start = new Date()
            start.setDate(now.getDate() - 30)
            end = now
        }
    }

    
    return { $gte:start , $lte:end }
}


export {
    calculateOrderNetAmount,
    calculateStats,
    getDateFilter
}