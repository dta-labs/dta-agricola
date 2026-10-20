let option = {
    title: {
        x: 'center',
        y: 'top',
        padding: [0, 0, 20, 0],
        text: 'Consumo de agua :: Real vs Estimada vs Temperatura',
        textStyle: {
            fontSize: 22,
            fontWeight: 'normal',
            fontColor: "#ffffff"
        }
    },
    tooltip: {
        trigger: 'axis'
    },
    toolbox: {
        show: true,
        feature: {
            dataVer: {
                show: true,
                readOnly: false
            },
            restore: {
                show: true
            },
            saveAsImage: {
                show: true
            }
        }
    },
    calculable: false,
    legend: {
        data: ['Consumo de agua 2022', 'Consumo de agua 2021', 'Temperatura 2022', 'Temperatura 2021'],
        y: 'bottom'
    },
    xAxis: [
        {
            type: 'category',
            data: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        }
    ],
    yAxis: [
        {
            type: 'value',
            name: 'mm',
            axisLabel: {
                formatter: '{value} mm'
            }
        },
        {
            type: 'value',
            name: '°C',
            axisLabel: {
                formatter: '{value} °C'
            }
        }
    ],
    series: [
        {
            name: 'Consumo de agua 2022',
            type: 'bar',
            data: [1.0, 2.9, 5.0, 20.2, 45.6, 76.7, 98.6, 120.2, 30.6, 16.0, 6.4, 3.3]
        },
        {
            name: 'Consumo de agua 2021',
            type: 'bar',
            data: [2.6, 5.9, 9.0, 26.4, 58.7, 150.7, 175.6, 182.2, 48.7, 18.8, 6.0, 2.3]
        },
        {
            name: 'Temperatura 2022',
            type: 'line',
            yAxisIndex: 1,
            data: [2.0, 2.2, 3.3, 4.5, 6.3, 10.2, 20.3, 23.4, 23.0, 16.5, 12.0, 6.2]
        },
        {
            name: 'Temperatura 2021',
            type: 'line',
            yAxisIndex: 1,
            data: [2.0, 1.9, 3.0, 3.5, 5.3, 7.2, 10.3, 13.4, 13.0, 26.5, 22.0, 16.2]
        }
    ]
}

var chartHist = echarts.init(document.getElementById('chartHist'), theme);
var chartTemp = echarts.init(document.getElementById('chartTemp'), theme);
var chartPrec = echarts.init(document.getElementById('chartPrec'), theme);

option.title.text = "Cosumo histórico de agua";
chartHist.setOption(option);
option.title.text = "Temperaturas";
chartTemp.setOption(option);
option.title.text = "Precipitaciones";
chartPrec.setOption(option);
