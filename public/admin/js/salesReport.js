 
document.getElementById('filterForm').addEventListener('submit',function(e){
    const filterType = document.getElementById('filterType').value

    if(filterType === 'custom'){
        const from = document.getElementById('customFrom').value
        const to = document.getElementById('customTo').value
        
        if(!from || !to){
            alert("Please select both From and To dates ")
            e.preventDefault()
            return
        }

        if(from > to){
            alert("From date cannot be after To Date")
            e.preventDefault()
        }
    }
})


function toggleCustomDate() {
    const filterType = document.getElementById('filterType').value
    const customFromDiv = document.getElementById('customFromDiv')
    const customToDiv = document.getElementById('customToDiv');

    if(filterType === 'custom'){
        customFromDiv.style.display = 'block'
        customToDiv.style.display = 'block'
    }else{
        customFromDiv.style.display = 'none'
        customToDiv.style.display = 'none'
    }
}

function downloadExcel(){
    const filterType = document.getElementById('filterType').value;
    const customFrom = document.getElementById('customFrom').value;
    const customTo = document.getElementById('customTo').value;

    let url = `/admin/sales-report/download/excel?filterType=${filterType}`

    if(filterType === 'custom'){
        url+= `&customFrom=${customFrom}&customTo=${customTo}`
    }

    window.location.href = url
}

function downloadPDF() {
    const filterType = document.getElementById('filterType').value
    const customFrom = document.getElementById('customFrom').value
    const customTo = document.getElementById('customTo').value

    let url = `/admin/sales-report/download/pdf?filterType=${filterType}`
    if(filterType === 'custom'){
        url+= `&customFrom=${customFrom}&customTo=${customTo}`
    }

    window.open(url, '_blank')

}

document.addEventListener('DOMContentLoaded',toggleCustomDate)
 
