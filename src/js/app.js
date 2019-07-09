import * as d3 from "d3"
import * as d3Fetch from "d3-fetch"
import * as d3Projections from "d3-geo-projection"
import world from 'world-atlas/world/50m.json' 
import * as topojson from 'topojson'
import geoff from './geoff'
import palette from "./palette"
import ScrollyTeller from "./scrollyteller"
import numeral from "numeral"
console.log(document.querySelector("#scrolly-1"))
const scrolly = new ScrollyTeller({
  parent: document.querySelector("#scrolly-1"),
  triggerTop: 1/3, // percentage from the top of the screen that the trigger should fire
  triggerTopMobile: 0.75,
  transparentUntilActive: true
}); 

const fc = topojson.feature(world, world.objects.countries) // I always call it 'fc' for 'FeatureCollection'

const euCountries = ["United Kingdom", "Spain", "France", "Germany", "Poland", "Austria", "Portugal", "Luxembourg", "Italy", "Denmark", "Netherlands", "Belgium", "Switzerland", "Czechia", "Croatia", "Cyprus", "Romania", "Bulgaria", "Estonia", "Latvia", "Ireland", "Hungary", "Greece", "Slovakia", "Slovenia", "Sweden"];

const width = document.body.clientWidth;
const height = window.innerHeight;

const margin = document.querySelector("#scrolly-1").getBoundingClientRect().left

document.querySelector("#scrolly-1").style.marginLeft = -margin + "px"

const mapped = fc.features.map(f => {
    return Object.assign({}, f, {name: geoff.alpha3ToName(geoff.numericToAlpha3(f.id))})
});

fc.features = mapped;

const bbox = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              -10.986328125,
              34.30714385628804
            ],
            [
              34.892578125,
              34.30714385628804
            ],
            [
              34.892578125,
              59.31076795603884
            ],
            [
              -10.986328125,
              59.31076795603884
            ],
            [
              -10.986328125,
              34.30714385628804
            ]
          ].reverse()
        ]
      }
    }
  ]
};

const offset = (width > 900) ? 300 : 0;

const proj = d3Projections.geoBonne()
  .fitSize([width - offset, height], bbox)

const path = d3.geoPath()
  .projection(proj)


const svg = d3.select("#data-viz")
    .attr("height", height)
    .attr("width", width)
    .style("overflow", "hidden")
    .append("g")
    .style("transform", "translateX(" + offset + "px)");

const countryShapes = svg
    .selectAll('blah')
    .data(fc.features)
    .enter()
    .append('path')
    .attr('d', path)
    .attr("id", d => d.name)
    .style("fill", d => {
        if(euCountries.filter(f => f === d.name).length > 0) {
            return "#333";
        } else {
            return "#161616"
        }
    })
    .style("stroke", d => {
        if(euCountries.filter(f => f === d.name).length > 0) {
            return "#161616";
        } else {
            return "#333"
        }
    })

const dataviz1 = svg.append("g")
const dataviz2 = svg.append("g")

let activeDatavizLayer = dataviz1;
let activeName = "1";

Promise.all([d3Fetch.json("https://interactive.guim.co.uk/docsdata-test/1kO5_S91NCP37AF5TOsrVZIIIdzbFsftnq66m5cokKtA.json"),d3Fetch.csv("<%= path %>/assets/trade_eu_2.csv")]).then(data => {
    const centroids = data[0].sheets.Sheet1;
    const ukCentroid = centroids.find(b => b.name === "United Kingdom");
    const ukCentroidProjected = proj([Number(ukCentroid.longitude), Number(ukCentroid.latitude)]);

    const imports = data[1].filter(d => d.Element === "Import Value").filter(d => d.Value != "0")
    const exports = data[1].filter(d => d.Element === "Export Value").filter(d => d.Value != "0")

    const liner = d3.line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveBasis);
    // console.log(d3.extent(data[1].filter(d => d.Value != "0"), d => Number(d.Value)))
    const rScale = d3.scaleSqrt().domain(d3.extent(data[1].filter(d => d.Value != "0").filter(d => d.Item !== "Total"), d => Number(d.Value))).range([0.5, 35])
    // .clamp(true);

    const animationDuration = 1000;
    
    const draw = (item, showImports, showExports) => {
      activeDatavizLayer.transition().duration(animationDuration).style("opacity", 0);
      activeDatavizLayer = (activeName === "1") ? dataviz2 : dataviz1;
      activeName = (activeName === "1") ? "2": "1";
      activeDatavizLayer.html("");

      const layer1 = activeDatavizLayer.append("g")
      const layer2 = activeDatavizLayer.append("g")
      const layer3 = activeDatavizLayer.append("g")

      // activeDatavizLayer.append("text")
      //   .text(item)
      //   .attr('x', 0)
      //   .attr("y", 48)
      //   .classed("big-label", true)

      const toMapImports = imports.filter(d => d.Item === item);
      const toMapExports = exports.filter(d => d.Item === item); 

      fc.features.forEach(f => {
          if(euCountries.filter(c => c === f.name).length > 0) {
              let centroid = centroids.find(b => b.name === f.name);

              const datumImports = toMapImports.find(d => d["Partner Countries"] === f.name);
              const datumExports = toMapExports.find(d => d["Partner Countries"] === f.name);
              if(((showImports && datumImports) || (showExports && datumExports)) && centroid) {
                  const start = proj([Number(centroid.longitude), Number(centroid.latitude)]);
                  const end = ukCentroidProjected;

                  const mid = (true) ? [start[0], end[1]] : [end[0], start[1]];

                  const bgpath = layer1.append("path")
                      .attr("d", liner([
                          start,
                          mid,
                          end
                        ]))
                        .style("fill", "none")
                      .style("stroke", "#767676")
                      .style("stroke-width", 0.5)

                    if(showImports && datumImports) {
                      const path = layer2.append("path")
                          .attr("d", liner([
                              start,
                              mid,
                              end
                            ]))
                            .style("fill", "none")
                          .style("stroke", palette.highlightDark)
                          .style("stroke-width", rScale(datumImports.Value))
                          .style("stroke-linecap", "square")
                          .classed("animated-line", true)
                    }

                    if(showExports && datumExports) {
                      const pathExports = layer2.append("path")
                          .attr("d", liner([
                              start,
                              mid,
                              end
                            ]))
                            .style("fill", "none")
                          .style("stroke", palette.guSport)
                          .style("stroke-width", rScale(datumExports.Value))
                          .style("stroke-linecap", "square")
                          .classed("animated-line", true)
                          .classed("animated-line--reverse", true)
                    }

                  // if(f.name !== "Denmark") {

                  const label = layer3.append("text")
                      .style("text-anchor", "middle")
                      .attr("x", start[0])
                      .attr("y", start[1] + 10)
                      .text(f.name)
                      .classed("country-name", true)
                      // .style("font-weight", "bold")
                     
                  if(showImports && datumImports) {
                        // .style("font-size", "14px")

                    const label2 = layer3.append("text")
                        .style("text-anchor", "middle")
                        .attr("x", start[0])
                        .attr("y", start[1] + 26)
                        .text(`I: $${numeral(Number(datumImports.Value)*1000).format("0a")}`) 
                        .classed("country-name", true)
                        // .style("fill", "#767676") 
                        .classed("country-name--number", true)
                        .style("fill", palette.highlightDark)
                  }

                  if(showExports && datumExports) {
                    // .style("font-size", "14px")

                    const label2 = layer3.append("text")
                        .style("text-anchor", "middle")
                        .attr("x", start[0])
                        .attr("y", (showImports && datumImports) ? start[1] + 42 : start[1] + 26)
                        .text(`E: $${numeral(Number(datumExports.Value)*1000).format("0a")}`) 
                        .classed("country-name", true)
                        // .style("fill", "#767676") 
                        .classed("country-name--number", true)
                        .style("fill", palette.guSport)
                  }
                  // } else {
                  //   const label = layer3.append("text")
                  //       .style("text-anchor", "middle")
                  //       .attr("x", start[0])
                  //       .attr("y", start[1] - 24)
                  //       .text(f.name)
                  //       .classed("country-name", true)
                  //       .style("font-weight", "bold")
                  //       // .style("font-size", "14px")

                  //   const label2 = layer3.append("text")
                  //       .style("text-anchor", "middle")
                  //       .attr("x", start[0])
                  //       .attr("y", start[1] - 8)
                  //       .text(`$${utils.numberWithCommas(Number(datumImports.Value)*1000)}`) 
                  //       .classed("country-name", true)
                  //       // .style("fill", "#767676") 
                  //       .classed("country-name--number", true)
                  }
              } 
          // } else {
          //     // return "#f6f6f6"
          // }

          activeDatavizLayer.transition().duration(animationDuration).style("opacity", 1)
      });
    }

    const dropdown = d3.select(".dropdown-1")
      .append("select");

    const listOfItems = (d3.nest().key(d => d.Item).entries(imports)).map(d => d.key);

    dropdown.selectAll("option")
        .data(listOfItems.filter(n => n !== "Total").sort((a,b) => a > b))
          .enter()
          .append("option")
          .text(d => d)
          .attr("value", d => d)
          .filter(n => (n === "Chocolate products nes")) 
          .attr("selected", "selected")

    dropdown.on("change", function(d) {
      const showImports = importsExportsDropdown.node().value == "Imports" || importsExportsDropdown.node().value == "Imports & exports"
      const showExports = importsExportsDropdown.node().value == "Exports" || importsExportsDropdown.node().value == "Imports & exports"
      draw(dropdown.node().value, showImports, showExports)
    })

    const importsExportsDropdown = d3.select(".dropdown-2")
      .append("select")

    importsExportsDropdown.selectAll("option")
      .data(["Imports & exports", "Imports", "Exports"])
      .enter()
      .append("option")
      .text(d => d)
          .attr("value", d => d)
          .filter(n => (n === "Exports")) 
          .attr("selected", "selected")

    importsExportsDropdown.on("change", function(d) {
      const showImports = importsExportsDropdown.node().value == "Imports" || importsExportsDropdown.node().value == "Imports & exports"
      const showExports = importsExportsDropdown.node().value == "Exports" || importsExportsDropdown.node().value == "Imports & exports"
      // console.log(showImpo)
      draw(dropdown.node().value, showImports, showExports)
    })

    draw("Wine", true, false)

    scrolly.addTrigger({num: 1, do: () => {
      draw("Wine", true, false)
    }});
    
    scrolly.addTrigger({num: 2, do: () => {
      draw("Cheese, whole cow milk", true, false)
    }});
    
    scrolly.addTrigger({num: 3, do: () => {
      draw("Bacon and ham", true, false)
    }});
    
    scrolly.addTrigger({num: 4, do: () => {
      draw("Potatoes, frozen", true, false)
    }});

    scrolly.addTrigger({num: 5, do: () => {
      draw("Tomatoes", true, false)
    }});

    scrolly.addTrigger({num: 6, do: () => {
      draw("Beverages, distilled alcoholic", false, true)
    }});

    scrolly.addTrigger({num: 7, do: () => {
      draw("Chocolate products nes", false, true)
    }});

    scrolly.addTrigger({num: 8, do: () => {
      // draw("Total", true, true)
    }});
    
    // scrolly.addTrigger({num: 5, do: () => {
    //   draw(listOfItems[5], true, true)
    // }});
    
    // scrolly.addTrigger({num: 6, do: () => {
    //   draw(listOfItems[6], true, true)
    // }});
    
    // scrolly.addTrigger({num: 7, do: () => {
    //   draw(listOfItems[7], true, true)
    // }}); 
    
    scrolly.watchScroll();
});

import * as chroma from "chroma-js"

const drawTernary = () => {
  const height = 860;
const width = 860;

const svg = d3.select(".interactive-wrapper").append("div")
  .classed("svg-wrapper", true)
  .style("height", height + "px")
  .style("width", width + "px")
  .append("svg")
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

const labelOffset = 55;
const [_A, _B, _C] = [150, 30, -90].map(d => [
    Math.cos(d * Math.PI / 180) * (size + labelOffset),
    Math.sin(d * Math.PI / 180) * (size + labelOffset) + yOffset
]);

const _a = line(_B, _C);
const _b = line(_C, _A);
const _c = line(_A, _B);

const ticks = d3.range(0, 100, 50).concat(100)
const grid = d3.range(0, 1, 0.5);

// triangle
chart.append("path")
.attr("d", `M${A}L${B}L${C}Z`)
// .attr("stroke", "#000")
.attr("fill", "#333")
.style("shape-rendering", "crispEdges");

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
    .attr("stroke", (d, i) => (i & 1) ? "#161616" : "#161616")
    .style("shape-rendering",  "auto")
    .attr("stroke-width", (d, i) => (i & 1) ? 1 : 1);

// ticks
// chart.append("g")
//     .attr("font-size", 10)
//     .selectAll(".axis")
//     .data([
//         ticks.map(tick => ({ tick, pos: a(tick / 100), rot: 0, anchor: "start"})),
//         ticks.map(tick => ({ tick, pos: b(tick / 100), rot: 60, anchor: "end"})),
//         ticks.map(tick => ({ tick, pos: c(tick / 100), rot: -60, anchor: "end"}))
//     ])
//     .enter().append("g")
//         .selectAll(".ticks")
//         .data(d => d)
//         .enter().append("text")
//         .attr("transform", d => `translate(${d.pos}) rotate(${d.rot})`)
//         .attr("text-anchor", d => d.anchor)
//         .attr("dx", d => 10 * (d.anchor === "start" ? 1 : -1))
//         .attr("dy", ".3em")
//     .text(d => d.tick);

// label
chart.append("g")
    .attr("font-size", 14)
    .selectAll(".labels")
    .data([
        { label: "◀ Imported more from EU", pos: _a(0.51), rot: 60, "text-anchor": "end", "color": "#ffb500"},
        { label: "◀ UK produces more", pos: _b(0.51), rot: -60, "text-anchor": "end", "color": "#ff4e36"},
        { label: "◀ UK produces more", pos: _c(0.49), rot: 0, "text-anchor": "end", "color": "#ff4e36"},
        { label: "Imported more from non-EU ▶", pos: _a(0.49), rot: 60, "text-anchor": "start", "color": "#00b2ff"},
        { label: "Imported more from EU ▶", pos: _b(0.49), rot: -60, "text-anchor": "start", "color": "#ffb500"},
        { label: "Imported more from non-EU ▶", pos: _c(0.51), rot: 0, "text-anchor": "start", "color": "#00b2ff"}
    ])
    .enter().append("text")
        .attr("transform", d => `translate(${d.pos}) rotate(${d.rot})`)
        .attr("text-anchor",d => d["text-anchor"])
        .style("font-weight", "bold")
        .style("fill", d => d.color)
        .text(d => d.label)

// data  

const rScale = d3.scaleSqrt().domain([0, 14831450]).range([0, 50])

const colourise = (d) => {
  // console.log(d.importEU_perc);

  if(Number(d.importEU_perc) > 0.5) {
    return "#ffbb50"
  }

  if(Number(d.importNonEU_perc) > 0.5) {
    return "#00b2ff"
  }

  if(Number(d.production_perc) > 0.5) {
    return "#ff4e36"
  }
  return "#767676";
}

const positionLabel = ([x,y], labelPosition) => {
  let newX = x;
  let newY = y
  let textAnchor = "middle";

  if(labelPosition == "right") {
    newX = newX + 10;
    newY = newY + 4
    textAnchor = "start"
  }

  if(labelPosition == "top") {
    newX = newX;
    newY = newY - 8
  }

  return [newX,newY, textAnchor]
}

const mouseenter = (d) => {
  const ml = document.querySelector(".mouse-overlay");
  ml.style.display = "block"
  ml.style.left = (d.pos[0] + width/2) + "px";
  ml.style.top = (d.pos[1] + height/2) + "px";

  ml.querySelector(".bars-wrapper").innerHTML = `
    <h4>${d.name}</h4>
    <div class="bar-stack percent-uk" data-label="UK" data-perc="${Math.round(Number(d.data.production_perc)*100)}%" style="height: ${Number(d.data.production_perc)*100}px"></div>
    <div class="bar-stack percent-eu" data-label="EU" data-perc="${Math.round(Number(d.data.importEU_perc)*100)}%" style="height: ${Number(d.data.importEU_perc)*100}px"></div>
    <div class="bar-stack percent-non-eu" data-label="Non-EU" data-perc="${Math.round(Number(d.data.importNonEU_perc)*100)}%" style="height: ${Number(d.data.importNonEU_perc)*100}px"></div>
  `;
}

d3Fetch.csv("<%= path %>/assets/sorted_2.csv").then(data => {
  const foodsToLabel = [{name: "Meat, chicken", position: "right"}, {name: "Mushrooms and truffles", position: "right", displayName:  "Mushrooms"}, {name: "Tomatoes", position: "right"}, {name: "Spinach", position: "right"}, {name: "Honey, natural", position: "right"}, {name: "Potatoes", position: "right"}, {name: "Chillies and peppers, green", displayName: "Chillies and peppers", position: "right"}];
  const cleanedData = data.map(d => ({
      name: d.I,
      color: colourise(d),
      pos: [
      A[0] * d.production_perc + B[0] * d.importNonEU_perc + C[0] * d.importEU_perc,
      A[1] * d.production_perc + B[1] * d.importNonEU_perc + C[1] * d.importEU_perc
      ],
      total: d.total,
      label: ((foodsToLabel.filter(c => d.I === c.name)).length > 0) ? (foodsToLabel.filter(c => d.I === c.name))[0] : undefined,
      data: d
  })); 

  chart.selectAll(".countries")
      .data(cleanedData.filter(d => !d.label))
      .enter().append("circle")
          // .attr("r", d => rScale(d.total))
          .attr("r", d => 5)
          .attr("id", d => d.name)
          .attr("cx", d => d.pos[0])
          .attr("cy", d => d.pos[1])
          .attr("fill", d => chroma.mix(d.color, '#fff', 0.29))
          .attr("stroke", d => {
            // if(foodsToLabel.filter(c => d.name === c.name).length > 0) {
            //   return "#000"
            // }
            return d.color
          })
          .on("mouseover", function(d) {
            mouseenter(d);
          })
          .on("mouseleave", function(d) {
            const ml = document.querySelector(".mouse-overlay");
            ml.style.display = "none"
          })
          // .style("fill-opacity", "0.5")
          // .append("title").text(d => d.name)

    chart.selectAll(".countries")
          .data(cleanedData.filter(d => d.label))
          .enter().append("circle")
              // .attr("r", d => rScale(d.total))
              .attr("r", d => 5)
              .attr("id", d => d.name)
              .attr("cx", d => d.pos[0])
              .attr("cy", d => d.pos[1])
              .attr("fill", d => chroma.mix(d.color, '#fff', 0.29))
              .attr("stroke", d => {
                if(foodsToLabel.filter(c => d.name === c.name).length > 0) {
                  return "#000"
                }
                return d.color
              })
              .on("mouseover", function(d) {
                mouseenter(d);
              })
              .on("mouseleave", function(d) {
                const ml = document.querySelector(".mouse-overlay");
                ml.style.display = "none"
              })

  chart.selectAll("text.circle-labels")
    .data(cleanedData.filter(d => d.label))
    .enter()
    .append("text")
      .attr("x", d => (d.label) ? positionLabel(d.pos, d.label.position)[0] : d.pos[0])
      .attr("y", d => (d.label) ? positionLabel(d.pos, d.label.position)[1] : d.pos[1])
      .style("font-size", "13")
      .style("fill", "#fff")
      .style("text-anchor", d => positionLabel(d.pos, d.label.position)[2])
      .text(d => d.displayName || d.name)

});
}

drawTernary();
