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
    const height = 7000;
    const width = 620;
    const dataFiltered = data.filter(d => d.include === "y");

    const chartHeight = 620;
    const chartWidth = 620;

    console.log(d3.min(dataFiltered, d => Number(d.totalUse)))
    const xScale = d3.scaleLinear().domain([0, 1, 1.0000001]).range([0, 620, 740]).clamp(true);
    // const rScale = d3.scaleSqrt().domain(d3.extent(dataFiltered, d => Number(d.totalUse))).range([2.5, 40]).clamp(true)

    const svg = d3.select(".interactive-wrapper").append("svg")
    .attr("height", height)
    .attr("width", width)

    svg.append("g")
        .call(d3.axisTop(xScale))

    svg.selectAll(".circles")
        .data(dataFiltered)
        .enter()
        .append("circle")
            .attr("cx", d => xScale(Number(d.leftAfterBrexit)))
            .attr("cy", (d,i) => i*75)
            .attr("r", d => 35)
            .style("fill", d => colourScale(Number(d.leftAfterBrexit)))

    svg.selectAll(".lines")
        .data(dataFiltered)
        .enter()
        .append("line")
            .attr("x1", 0)
            .attr("x2", d => xScale(Number(d.leftAfterBrexit)))
            .attr("y1", (d,i) => i*75)
            .attr("y2", (d,i) => i*75)
            .style("stroke", "#dcdcdc")
            .style("stroke-width", 1)

    svg.selectAll(".labels")
        .data(dataFiltered)
        .enter()
        .append("text")
            .attr("x", d => xScale(Number(d.leftAfterBrexit)) + 15)
            .attr("y", (d,i) => i*75)
            .text(d => d.I + " / " + d.leftAfterBrexit)
            .style("fill", d => colourScale(Number(d.leftAfterBrexit)))

    

});