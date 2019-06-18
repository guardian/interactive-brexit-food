import * as d3 from "d3"

const regions = ["Africa", "Americas", "Asia", "Europe", "Oceania"]

const height = 1260;
const width = 1260;

const svg = d3.select(".interactive-wrapper").append("svg")
    .attr("width", width)
    .attr("height", height);

function line([x1, y1], [x2, y2]) {
    return function(t) {
        return [
        x1 + t * (x2 - x1),
        y1 + t * (y2 - y1)
        ]
    }
}
  
const chart = svg.append('g')
    .attr("transform", `translate(${width / 2} ${height / 2})`)
    .attr("font-family", "sans-serif");

const size = Math.min(width, height) / 2;
const yOffset = (size - Math.sin(30 * Math.PI / 180) * size) / 2;

const [A, B, C] = [150, 30, -90].map(d => [
    Math.cos(d * Math.PI / 180) * size,
    Math.sin(d * Math.PI / 180) * size + yOffset
]);

const a = line(B, C);
const b = line(C, A);
const c = line(A, B);

const labelOffset = 80;
const [_A, _B, _C] = [150, 30, -90].map(d => [
    Math.cos(d * Math.PI / 180) * (size + labelOffset),
    Math.sin(d * Math.PI / 180) * (size + labelOffset) + yOffset
]);

const _a = line(_B, _C);
const _b = line(_C, _A);
const _c = line(_A, _B);

const ticks = d3.range(0, 100, 20).concat(100)
const grid = d3.range(0, 1, 0.1);

// triangle
chart.append("path")
.attr("d", `M${A}L${B}L${C}Z`)
.attr("fill", "#ececec")
.attr("stroke", "none");

// grid
chart.append("g")
.selectAll(".grid")
.data([
    grid.map(tick => [a(tick), b(1 - tick)]),
    grid.map(tick => [b(tick), c(1 - tick)]),
    grid.map(tick => [c(tick), a(1 - tick)])
])
.enter().append("g")
    .selectAll(".gridlines")
    .data(d => d)
    .enter().append("line")
    .attr("x1", d => d[0][0])
    .attr("y1", d => d[0][1])
    .attr("x2", d => d[1][0])
    .attr("y2", d => d[1][1])
    .attr("stroke", "#fff")
    .attr("stroke-width", (d, i) => i & 1 ? 1 : 2);

// ticks
chart.append("g")
    .attr("font-size", 10)
    .selectAll(".axis")
    .data([
        ticks.map(tick => ({ tick, pos: a(tick / 100), rot: 0, anchor: "start"})),
        ticks.map(tick => ({ tick, pos: b(tick / 100), rot: 60, anchor: "end"})),
        ticks.map(tick => ({ tick, pos: c(tick / 100), rot: -60, anchor: "end"}))
    ])
    .enter().append("g")
        .selectAll(".ticks")
        .data(d => d)
        .enter().append("text")
        .attr("transform", d => `translate(${d.pos}) rotate(${d.rot})`)
        .attr("text-anchor", d => d.anchor)
        .attr("dx", d => 10 * (d.anchor === "start" ? 1 : -1))
        .attr("dy", ".3em")
    .text(d => d.tick);

// label
chart.append("g")
    .attr("font-size", 16)
    .selectAll(".labels")
    .data([
        { label: "production", pos: _a(0.5), rot: 60 },
        { label: "importEU", pos: _b(0.5), rot: -60 },
        { label: "importNonEU", pos: _c(0.5), rot: 0 }
    ])
    .enter().append("text")
        .attr("transform", d => `translate(${d.pos}) rotate(${d.rot})`)
        .attr("text-anchor", "middle")
        .text(d => d.label)

// data  

const rScale = d3.scaleSqrt().domain([0, 14831450]).range([0, 50])

d3.csv("<%= path %>/assets/sorted_2.csv").then(data => {
    console.log(data);
    chart.selectAll(".countries")
        .data(data.map(d => ({
            name: d.I,
            color: "#c70000",
            pos: [
            A[0] * d.importEU_perc + B[0] * d.importNonEU_perc + C[0] * d.production_perc,
            A[1] * d.importEU_perc + B[1] * d.importNonEU_perc + C[1] * d.production_perc
            ],
            total: d.total
        })))
        .enter().append("circle")
            // .attr("r", d => rScale(d.total))
            .attr("r", d => 3.5)
            .attr("id", d => d.name)
            .attr("cx", d => d.pos[0])
            .attr("cy", d => d.pos[1])
            .attr("fill", d => d.color)
            .attr("stroke", "#ddd")
            .append("title").text(d => d.name);
});