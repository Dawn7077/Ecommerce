 
  const data = document.getElementById('chart-json').textContent
  const chartData = JSON.parse(data)

  const productLabel = chartData.products.labels
  const productData = chartData.products.values
  const categoryLabels = chartData.categories.labels
  const categoryData = chartData.categories.values
  const brandsLabels = chartData.brands.labels
  const brandsData = chartData.brands.values 

  let productChart
  let categoryChart
  let brandChart

  // console.log('========================start here')
  // console.log(categoryLabels,'=========\n',categoryData)

  


  function updateChart(data){

    console.log(data.products.labels,data.categories.labels)

    if(productChart) productChart.destroy()

    productChart = new Chart(
      document.getElementById('topProductsChart'),{
        type:'bar',
        data:{
          labels:data.products.labels,
          datasets:[{
            label:"Unit Sold",
            data:data.products.values,
            backgroundColor: '#4A90E2',
            borderColor: '#357ABD',
            borderWidth: 1
          }]
        },
        options:{
          responsive:true,
          scales:{
            y:{beginAtZero:true}
          }
        }
      })


      if(categoryChart) categoryChart.destroy()

      categoryChart = new Chart(
        document.getElementById('topCategoriesChart'),{
          type:'doughnut',
          data:{
            labels:data.categories.labels,
            datasets:[{ 
              label:'Unit Sold',
              data:data.categories.values,
              backgroundColor: [
                  '#36A2EB',
                  '#FF6384',
                  '#FFCE56',
                  '#4BC0C0',
                  '#9966FF',
                  '#FF9F40',
                  '#FF6B6B',
                  '#4ECDC4',
                  '#45B7D1',
                  '#96CEB4'
                ]
            }]
          },
          options:{
            responsive:true,  
            maintainAspectRatio: true,
            plugins: {
              legend: {
                  position: 'bottom'
              }
            }
          }

        })

    if(brandChart)brandChart.destroy()
    if (data.brands && data.brands.labels.length > 0) {
      brandChart = new Chart(
        document.getElementById('topBrandsChart'),{
            type:'doughnut',
            data:{
              labels:data.brands.labels,
              datasets:[{
                data:data.brands.values,
                backgroundColor:[ 
                  '#FF9F40','#4BC0C0','#9966FF',
                  '#36A2EB','#FF6384','#FFCE56'
                ]
              }]
            },
            options:{
              responsive:true,
              plugins:{
                legend:{ position:'bottom'}
              }
            }
          }) 
    }

    
  
  }

  async function loadDashboardData(filterType) {
    try {
      const res = await fetch(`/admin/dashboard/data?filterType=${filterType}`)
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      
      const data = await res.json()
      console.log('Received data:', data);
      updateChart(data) 

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('Failed to load dashboard data. Please try again.');
    }
  }
  
  let salesChart

  function renderSalesChart(labels,values){
    if(salesChart) salesChart.destroy()

    salesChart = new Chart(
      document.getElementById('salesChart'),{
        type:'line',
        data:{
          labels,
          datasets:[{
            label:'Sales (₹)',
            data:values,
            borderColor: '#4A90E2',
            backgroundColor: 'rgba(74, 144, 226, 0.1)',
            fill:true,
            tension:0.4,
            pointRadius:4,
            pointBackgroundColor: '#4A90E2',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 6
          }]
        },  
        options:{
          responsive:true,
          scales:{
            y:{
              beginAtZero:true,
              ticks:{
                callback:function(value) {
                    return '₹' + value.toLocaleString('en-IN');
                }
              }
            }
          },
          plugins: {
              legend: {
                  display: true
              },
              tooltip: {
                  callbacks: {
                      label: function(context) {
                          return 'Sales: ₹' + context.parsed.y.toLocaleString('en-IN');
                      }
                  }
              }
          } 
        }
        
      })

    }
    
  async function loadSalesChart(filterType) {
     try {
        const res = await fetch(`/admin/dashboard/sales?filterType=${filterType}`);
        if (!res.ok) throw new Error('Failed to fetch sales data');
        
        const data = await res.json();
        renderSalesChart(data.labels, data.values);
    } catch (error) {
        console.error('Error loading sales chart:', error);
        alert('Failed to load sales chart. Please try again.');
    }
  } 

  
  document.getElementById('filterType').addEventListener('change',(e)=>{
    const filterType = e.target.value
    
    loadDashboardData(filterType)
    loadSalesChart(filterType)
  })
 

  document.addEventListener('DOMContentLoaded', () => { 
      loadDashboardData('daily');
      // loadDashboardData(chartData);
      loadSalesChart('daily');
  });



  // const productLabel = <%- JSON.stringify(topProducts.map(p=> p.product.productName)) %>;
  // const productData = <%- JSON.stringify(topProducts.map(p=> p.totalSold)) %>;
  // const categoryLabels =  <%- JSON.stringify(topCategories.map(c=> c.category.name)) %>;
  // const categoryData =  <%- JSON.stringify(topCategories.map(c=> c.totalSold)) %>;
   
 