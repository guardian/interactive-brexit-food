import * as d3 from "d3"
import * as d3Fetch from "d3-fetch"
import * as d3Beeswarm from "d3-beeswarm"

const colours = [
    '#ff1921','#ff990c','#ffe500','#0084c6'
]

const colourScale = (x) => {
    if(x < 0.25) {
        return colours[0]
    }

    if(x < 0.5) {
        return colours[1]
    }

    if(x < 0.75) {
        return colours[2]
    }

    return colours[3]
}

d3Fetch.csv("<%= path %>/assets/sorted_2.csv").then(data => {
    // console.log(data);

    // console.log(d3Beeswarm)
    const height = 620;
    const width = 620;

    const chartHeight = 620;
    const chartWidth = 620;

    // const xScale = d3.scaleLinear().domain([0, 1]).range([0, chartWidth])
    // const yScale = d3.scaleLinear().domain([0, 1]).range([chartHeight, 0])

    // const label = d3.select('.interactive-wrapper').append("div")
    // const svg = d3.select(".interactive-wrapper").append("svg").attr("height", height).attr("width", width).append("g").attr("transform", `translate(${(width-chartWidth)/2},${(height-chartHeight)/2}) rotate(-45,${chartWidth/2},${chartHeight/2})`);

    // const axisG = svg.append('g');

    // axisG.append("g").classed("x-axis", true).attr("transform", `translate(0, ${chartHeight})`).call(d3.axisBottom(xScale))

    // axisG.append("g").classed("y-axis", true).call(d3.axisLeft(yScale));

    // svg.selectAll("circle")
    //     .data(data.filter(d => d.leftAfterBrexit !== "NA"))
    //     .enter()
    //     .append("circle")
    //     .attr("r", 4) 
    //     .attr("cx", d => xScale(d.production_perc))
    //     .attr("cy", d => yScale(d.importNonEU_perc))
    //     .style("fill", d => colourScale(d.leftAfterBrexit))
    //     .style("stroke", "#fff")
    //     .on("mousemove", function(d) {
    //         label.html(`${d.I}. UK: ${Number(d.production_perc).toFixed(2)}, ROW: ${Number(d.importNonEU_perc).toFixed(2)}, EU: ${Number(d.importEU_perc).toFixed(2)}`);
    //     });

    function round(x) { return x%5<3 ? (x%5===0 ? x : Math.floor(x/5)*5) : Math.ceil(x/5)*5 }

    const yScale = d3.scaleLinear().domain([0, 1]).range([0, width]).clamp(true)  
    var swarm = d3Beeswarm
    .beeswarm()
    .data(data.filter(d => d.leftAfterBrexit !== "NA")) // set the data to arrange
    .distributeOn(function(d) {
        // set the value accessor to distribute on
        return (yScale(round(Number(d.leftAfterBrexit)*100)/100)); // evaluated once on each element of data
    }) // when starting the arrangement
    .radius(15) // set the radius for overlapping detection
    .orientation('horizontal') // set the orientation of the arrangement
    // could also be 'vertical'
    .side('negative') // set the side(s) available for accumulation 
    // could also be 'positive' or 'negative'
    .arrange(); 

    console.log(swarm)

    const svg = d3.select(".interactive-wrapper").append("svg").attr("height", height).attr("width", width);

    svg.selectAll('circle')
    .data(swarm)
    .enter()
    .append('circle')
    .attr('cx', function(bee) {
        return bee.x;
    })
    .attr('cy', function(bee) {
        return bee.y + height/2;
    })
    .attr('r', 12.5)
    .style('fill', function(bee) {
        return colourScale(bee.datum.leftAfterBrexit);
    })
    .style('stroke', function(bee) {
        return colourScale(bee.datum.leftAfterBrexit);
    })
    .style("stroke-width", 1)
    .style("fill-opacity", 0.75)
    .on("mousemove", function(d) {
        d3.select(".label").text(d.datum.I + " – " + Number(d.datum.leftAfterBrexit).toFixed(2))
    })
});


// const yScale = d3.scaleLinear().domain([0, 1]).range([0, height]).clamp(true)  
// var swarm = d3Beeswarm
// .beeswarm()
// .data(data.filter(d => d.leftAfterBrexit !== "NA")) // set the data to arrange
// .distributeOn(function(d) {
//     // set the value accessor to distribute on
//     return yScale(Number(d.leftAfterBrexit)); // evaluated once on each element of data
// }) // when starting the arrangement
// .radius(10) // set the radius for overlapping detection
// .orientation('vertical') // set the orientation of the arrangement
// // could also be 'vertical'
// .side('symetric') // set the side(s) available for accumulation 
// // could also be 'positive' or 'negative'
// .arrange(); 

// console.log(swarm)

// const svg = d3.select(".interactive-wrapper").append("svg").attr("height", height).attr("width", width);

// svg.selectAll('circle')
// .data(swarm)
// .enter()
// .append('circle')
// .attr('cx', function(bee) {
//   return bee.x + width/2;
// })
// .attr('cy', function(bee) {
//   return bee.y;
// })
// .attr('r', 9.5)
// .style('fill', function(bee) {
//   return colourScale(bee.datum.leftAfterBrexit);
// })
// .on("mouseenter", function(d) {
    
// });