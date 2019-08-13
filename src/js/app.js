import Promise from 'promise-polyfill'; 
if (!window.Promise) {
  window.Promise = Promise;
}

import fetch from 'unfetch'

import * as d3Fetch from "d3-fetch"
import * as d3Projections from "d3-geo-projection"

import * as d3Array from "d3-array"
import * as d3Select from "d3-selection"
import * as d3Scale from "d3-scale"
import * as d3Shape from "d3-shape"
import * as d3Format from "d3-format"
import * as d3G from "d3-geo"
import {
    event as d3event
} from "d3-selection"
import * as d3Collection from "d3-collection"

const d3 = Object.assign({}, d3Array,d3Collection, d3Select, d3Scale, d3Shape, d3Format, d3G);

import world from '../assets/countries_simp.json' 
import * as topojson from 'topojson'
import geoff from './geoff'
import palette from "./palette"
import ScrollyTeller from "./scrollyteller"
import numeral from "numeral"


console.log(document.querySelector("#scrolly-1"))
const scrolly = new ScrollyTeller({
  parent: document.querySelector("#scrolly-1"),
  triggerTop: 1/2, // percentage from the top of the screen that the trigger should fire
  triggerTopMobile: 0.75,
  transparentUntilActive: true
}); 

const fc = topojson.feature(world, world.objects["countries_simp"]) // I always call it 'fc' for 'FeatureCollection'

const euCountries = ["United Kingdom", "Spain", "France", "Germany", "Poland", "Austria", "Portugal", "Luxembourg", "Italy", "Denmark", "Netherlands", "Belgium", "Czechia", "Croatia", "Cyprus", "Romania", "Bulgaria", "Estonia", "Latvia", "Ireland", "Hungary", "Greece", "Slovakia", "Slovenia", "Sweden", "Finland", "Malta", "Lithuania"];

const width = document.body.clientWidth;
const height = window.innerHeight;

const margin = document.querySelector("#scrolly-1").getBoundingClientRect().left

document.querySelector("#scrolly-1").style.marginLeft = -margin + "px"

fc.features = fc.features.map(f => {
  return Object.assign({}, f, {name: geoff.alpha3ToName(geoff.numericToAlpha3(f.properties.ISO_N3))})
});

console.log(fc.features); 
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
              -10.546875,
              34.23451236236987
            ],
            [
              35.68359375,
              34.23451236236987
            ],
            [
              35.68359375,
              61.938950426660604
            ],
            [
              -10.546875,
              61.938950426660604
            ],
            [
              -10.546875,
              34.23451236236987
            ]
          ].reverse()
        ]
      }
    }
  ]
};

const isMobile = (document.body.clientWidth < 600);
const offset = (width > 900) ? 240 : 0;

const scale = window.devicePixelRatio;
const cHeight = scale * height;
const cWidth = scale * width;

const canvas = d3.select(".scroll-inner canvas").attr("height", (isMobile) ? cHeight/2 : cHeight).attr("width", cWidth - (scale*offset)).style("transform", "translateX(" + offset + "px)").style("width", (width - offset) + "px").style("height", ((isMobile) ? height/2 : height) + "px");

const projCanvas = d3Projections.geoBonne()
  .fitSize([cWidth - (offset * scale), (isMobile) ? cHeight/2 : cHeight], bbox)

const proj = d3Projections.geoBonne()
  .fitSize([width - offset, (isMobile) ? height/2 : height], bbox)

  const path = d3.geoPath()
  .projection(proj)

const svg = d3.select("#data-viz")
    .attr("height", (isMobile) ? height/2 : height)
    .attr("width", width)
    .style("overflow", "hidden")
    .append("g")
    .style("transform", "translateX(" + offset + "px)");

const context = canvas.node().getContext("2d");
const pathC = d3.geoPath(null, context).projection(projCanvas);
context.lineJoin = "round";
context.lineCap = "round";

fc.features.forEach(f => {
  context.beginPath();
  pathC(f);
  context.lineWidth = 1*scale;

  if(euCountries.filter(e => e === f.name).length > 0) {
    context.fillStyle = "#333";
    context.strokeStyle = "#161616";
  } else {
    context.fillStyle = "#161616";
    context.strokeStyle = "#333";
  }

  context.fill();
  context.stroke();
});


const dataviz1 = svg.append("g")
const dataviz2 = svg.append("g")

let activeDatavizLayer = dataviz1;
let inactiveDatavizLayer = dataviz2;
let activeName = "1";
let isAnimating = false;
let lastItem = "Wine";

Promise.all([d3Fetch.json("https://interactive.guim.co.uk/docsdata-test/1kO5_S91NCP37AF5TOsrVZIIIdzbFsftnq66m5cokKtA.json"),d3Fetch.csv("<%= path %>/assets/trade_eu.csv")]).then(data => {
    const centroids = data[0].sheets.Sheet1;
    const ukCentroid = centroids.find(b => b.name === "United Kingdom");
    const ukCentroidProjected = proj([Number(ukCentroid.longitude), Number(ukCentroid.latitude)]);

    const dataMod = data[1].map(d => {
      d["Value"] = d["Value"]/1.2399
      return d;
    })
    .filter(d => d["Value"] > 1)

    const imports = dataMod.filter(d => d.Element === "Import Value").filter(d => d.Value != "0")
    const exports = dataMod.filter(d => d.Element === "Export Value").filter(d => d.Value != "0")

    const liner = d3.line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveBasis);
    // console.log(d3.extent(data[1].filter(d => d.Value != "0"), d => Number(d.Value)))

    const maxR = Math.min(40*(width/1300), 40);

    const rScale = d3.scaleSqrt().domain(d3.extent(dataMod.filter(d => d.Value != "0").filter(d => d.Item !== "Total"), d => Number(d.Value))).range([0.5, maxR])
    // .clamp(true);

    const animationDuration = 1000; 
    
    const draw = (item, showImports, showExports) => {
      if(item !== lastItem) {
        return;
      }

      if(isAnimating) {
        setTimeout(() => {
          draw(item, showImports, showExports);
        }, 501);
        return;
      }
      
      activeDatavizLayer = (activeName === "1") ? dataviz2 : dataviz1;
      inactiveDatavizLayer = (activeName === "1") ? dataviz1 : dataviz2;
      activeName = (activeName === "1") ? "2": "1";

      const layer1 = activeDatavizLayer.append("g")
      const layer3 = activeDatavizLayer.append("g")
      const layer2 = activeDatavizLayer.append("g")

      // activeDatavizLayer.append("text")
      //   .text(item)
      //   .attr('x', 0)
      //   .attr("y", 48)
      //   .classed("big-label", true)

      const toMapImports = imports.filter(d => d.Item === item);
      const toMapExports = exports.filter(d => d.Item === item); 

      const countriesToLabelImports = toMapImports.slice().sort((a,b) => Number(b.Value) - Number(a.Value)).map(d => d.Value)[3];
      const countriesToLabelExports = toMapExports.slice().sort((a,b) => Number(b.Value) - Number(a.Value)).map(d => d.Value)[3];

      fc.features.forEach(f => {
          if(euCountries.filter(c => c === f.name).length > 0) {
              let centroid = centroids.find(b => b.name === f.name); 

              const datumImports = toMapImports.find(d => d["Partner Countries"] === f.name);
              const datumExports = toMapExports.find(d => d["Partner Countries"] === f.name);
              
              if(((showImports && datumImports) || (showExports && datumExports)) && centroid) {
                  const start = proj([Number(centroid.longitude), Number(centroid.latitude)]);
                  const end = ukCentroidProjected;

                  const mid = (true) ? [start[0], end[1]] : [end[0], start[1]];

                    if(showImports && datumImports) {

                      const bgpath = layer1.append("path")
                      .attr("d", liner([
                          start,
                          mid,
                          end
                        ]))
                        .style("fill", "none")
                      .style("stroke", palette.highlightDark)
                      .style("stroke-opacity", 0.075)
                      .style("stroke-width", rScale(datumImports.Value))
                      .style("stroke-linecap", "round")


                      const path = layer2.append("path")
                          .attr("d", liner([
                              start,
                              mid, 
                              end
                            ]))
                            .style("fill", "none")
                          .style("stroke", palette.highlightDark)
                          .style("stroke-width", rScale(datumImports.Value))
                          // .style("stroke-linecap", "square")
                          .classed("animated-line", true)
                    }

                    if(showExports && datumExports) {

                      const bgpath = layer1.append("path")
                      .attr("d", liner([
                          start,
                          mid,
                          end
                        ]))
                        .style("fill", "none")
                      .style("stroke", palette.guSport)
                      .style("stroke-opacity", 0.075)
                      .style("stroke-width", rScale(datumExports.Value))
                      .style("stroke-linecap", "round")


                      const pathExports = layer2.append("path")
                          .attr("d", liner([
                              start,
                              mid,
                              end
                            ]))
                            .style("fill", "none")
                          .style("stroke", palette.guSport)
                          .style("stroke-width", rScale(datumExports.Value))
                          // .style("stroke-linecap", "square")
                          .classed("animated-line", true)
                          .classed("animated-line--reverse", true)
                    }

                  // if(f.name !== "Denmark") {
                  
                  // if(countriesToLabelImports.find(n => n === f.name)) {
                  const label = layer3.append("text")
                      .style("text-anchor", "middle")
                      .attr("x", start[0])
                      .attr("y", start[1] + 14)
                      .text((isMobile) ? geoff.nameToAlpha3(f.name) : f.name)
                      .classed("country-name", true)
                      // .style("font-weight", "bold")
                    
                  const mobileModifier = isMobile ? -4 : 0
                  if(showImports && datumImports && (!isMobile || Number(datumImports.Value) > Number(countriesToLabelImports))) {
                        // .style("font-size", "14px")

                    const label2 = layer3.append("text")
                        .style("text-anchor", "middle")
                        .attr("x", start[0])
                        .attr("y", start[1] + 30 + mobileModifier)
                        .text(`£${numeral(Number(datumImports.Value)*1000).format("0a")}`) 
                        .classed("country-name", true)
                        // .style("fill", "#767676") 
                        .classed("country-name--number", true)
                        .style("fill", palette.highlightDark)
                  }
                  // }

                  if(showExports && datumExports && (!isMobile || Number(datumExports.Value) > Number(countriesToLabelExports))) {
                    // .style("font-size", "14px")

                    const label2 = layer3.append("text")
                        .style("text-anchor", "middle")
                        .attr("x", start[0])
                        .attr("y", (showImports && datumImports) ? start[1] + 42 : start[1] + 30 + mobileModifier)
                        .text(`£${numeral(Number(datumExports.Value)*1000).format("0a")}`) 
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
          // });
      });

      activeDatavizLayer.style("opacity", 1)
      inactiveDatavizLayer.style("opacity", 0)
      isAnimating = true;
      setTimeout(() => {
        isAnimating = false;
        inactiveDatavizLayer.html("")
      }, 500);
    }

    const dropdown = d3.select(".dropdown-1")
      .append("select");

    const listOfItems = (d3.nest().key(d => d.Item).entries(imports)).map(d => d.key);

    dropdown.selectAll("option")
        .data(listOfItems.filter(n => n !== "Total").filter(d => d !== "Mat�").sort())
          .enter()
          .append("option")
          .text(d => d)
          .attr("value", d => d)
          .filter(n => (n === "Meat, sheep")) 
          .attr("selected", "selected")

    dropdown.on("change", function(d) {
      const showImports = importsExportsDropdown.node().value == "Imports" || importsExportsDropdown.node().value == "Imports & exports"
      const showExports = importsExportsDropdown.node().value == "Exports" || importsExportsDropdown.node().value == "Imports & exports"
      lastItem = dropdown.node().value;
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
      lastItem = dropdown.node().value;
      draw(dropdown.node().value, showImports, showExports)
    })

    draw("Wine", true, false);

    scrolly.addTrigger({num: 1, do: () => {
      lastItem = "Wine";
      draw("Wine", true, false)
    }});
    
    scrolly.addTrigger({num: 2, do: () => {
      lastItem = "Cheese, whole cow milk";
      draw("Cheese, whole cow milk", true, false)
    }});
    
    scrolly.addTrigger({num: 3, do: () => {
      lastItem = "Bacon and ham";
      draw("Bacon and ham", true, false)
    }});
    
    scrolly.addTrigger({num: 4, do: () => {
      lastItem = "Potatoes, frozen";
      draw("Potatoes, frozen", true, false)
    }}); 

    scrolly.addTrigger({num: 5, do: () => {
      lastItem = "Tomatoes"
      draw("Tomatoes", true, false)
    }});

    scrolly.addTrigger({num: 6, do: () => {
      lastItem = "Meat, sheep";
      draw("Meat, sheep", false, true)
    }});

    // scrolly.addTrigger({num: 6, do: () => {
    //   draw("Chocolate products nes", false, true)
    // }});

    scrolly.addTrigger({num: 7, do: () => {
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

const drawTernary = () => {


const height = document.querySelector(".interactive-wrapper").clientWidth;
const width = height;

console.log(height);

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

d3.select(".interactive-wrapper").append("div").text(`Note: percentages are based on tonnes of imports`).classed("note-label", true);

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

const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

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
        .text(d => (isMobile) ? (width < 360) ? d.label.replace(/◀/g, "<").replace(/▶/g, ">").replace(/Imported more/g, "More") : d.label.replace(/◀/g, "<").replace(/▶/g, ">") : (width < 500 ? d.label.replace(/Imported more/g, "More") : d.label ))

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
  labelPosition = labelPosition || "right";

  if(labelPosition == "right") {
    newX = newX + 10;
    newY = newY + 4
    textAnchor = "start"
  }

  if(labelPosition == "top") {
    newX = newX;
    newY = newY - 12
  }

  if(labelPosition == "bottom") {
    newX = newX;
    newY = newY + 18
  }

  if(labelPosition == "left") {
    newX = newX - 14;
    newY = newY + 4
    textAnchor = "end"
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
  const foodsToLabel = [{name: "Meat, chicken", position: "right"}, {name: "Mushrooms and truffles", position: "right", displayName:  "Mushrooms"}, {name: "Tomatoes", position: "right"}, {name: "Spinach", position: "right"}, {name: "Honey, natural", position: "right"}, {name: "Potatoes", position: "right"}, {name: "Chillies and peppers, green", displayName: "Chillies and peppers", position: "bottom", hideMobile: true},{name: "Beans, green", position: "top"}, {name:"Apples"}, {name:"Avocados", position: "left"}, {name:"Cucumbers and gherkins", displayName: "Cucumbers", position:"top"}];
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
          .attr("r", d => 3.5)
          .attr("id", d => d.name)
          .attr("cx", d => d.pos[0])
          .attr("cy", d => d.pos[1])
          .attr("fill", d => d.color)
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
          .style("fill-opacity", "0.05")
          .style("stroke-width", 1.5)
          // .append("title").text(d => d.name)

    chart.selectAll(".countries")
          .data(cleanedData.filter(d => d.label))
          .enter().append("circle")
              // .attr("r", d => rScale(d.total))
              .attr("r", d => 3.5)
              .attr("id", d => d.name)
              .attr("cx", d => d.pos[0])
              .attr("cy", d => d.pos[1])
              .attr("fill", d => d.color)
              // .style("fill-opacity", "0.5")
              .style("stroke-width", 1.5)
              .attr("stroke", d => {
                // if(foodsToLabel.filter(c => d.name === c.name).length > 0) {
                //   return "#000"
                // }
                return d.color
              })
              .on("mouseenter", function(d) {
                mouseenter(d);
              })
              .on("mouseleave", function(d) {
                const ml = document.querySelector(".mouse-overlay");
                ml.style.display = "none"
              }) 

  chart.selectAll("text.circle-labels")
    .data(cleanedData.filter(d => d.label).filter(d => !(window.innerWidth < 500 && d.label.hideMobile)))
    .enter()
    .append("text")
      .attr("x", d => (d.label) ? positionLabel(d.pos, d.label.position)[0] : d.pos[0])
      .attr("y", d => (d.label) ? positionLabel(d.pos, d.label.position)[1] : d.pos[1])
      .style("font-size", "13")
      .style("fill", "#fff")
      .style("text-anchor", d => positionLabel(d.pos, d.label.position)[2])
      .text(d => (d.label.displayName) ? d.label.displayName : d.name)


  // const anno = [`Foods higher up the chart`, `are more reliant on`, `EU imports, and so are possibly`, `more at risk of disruption`, `in a no-deal Brexit`];
  const anno = ["Foods higher up the chart","are more at risk of","disruption or price increases","after a no-deal Brexit"];
  
  if(window.innerWidth > 500) {
    const leftMargin = (window.innerWidth > 1200) ? 120 : 0;

    anno.forEach((n, i) => {
      svg.append("text")
        .classed("text-label-ternary", true)
        .text(n)
        .attr("x", leftMargin)
        .attr("y", (leftMargin + 12) + (i*18))
    });

    } else {
      d3.select(".svg-wrapper").style("margin-top", "48px");
      const div = d3.select(".svg-wrapper").insert("div",":first-child");

      div.html(`Foods higher up the chart are more at risk of disruption or price increases after a no-deal Brexit`);
    }
});
}

drawTernary();
