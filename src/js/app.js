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

const width = document.querySelector("#scrolly-1").clientWidth;
const height = window.innerHeight;

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

const proj = d3Projections.geoBonne()
  .fitSize([width - 300, height], bbox)

const path = d3.geoPath()
  .projection(proj)

const svg = d3.select("#data-viz")
    .attr("height", height)
    .attr("width", width)
    .style("overflow", "hidden")
    .append("g")
    .style("transform", "translateX(300px)");

const countryShapes = svg
    .selectAll('blah')
    .data(fc.features)
    .enter()
    .append('path')
    .attr('d', path)
    .attr("id", d => d.name)
    .style("fill", d => {
        if(euCountries.filter(f => f === d.name).length > 0) {
            return "#eaeaea";
        } else {
            return "#fff"
        }
    })
    .style("stroke", d => {
        if(euCountries.filter(f => f === d.name).length > 0) {
            return "#fff";
        } else {
            return "#eaeaea"
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
              if((datumImports && datumExports) && centroid) {
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
                      .style("stroke", "#bdbdbd")
                      .style("stroke-width", 0.5)

                    if(showImports) {
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

                    if(showExports) {
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
                     
                  if(showImports) {
                        // .style("font-size", "14px")

                    const label2 = layer3.append("text")
                        .style("text-anchor", "middle")
                        .attr("x", start[0])
                        .attr("y", start[1] + 26)
                        .text(`I: $${numeral(Number(datumImports.Value)*1000).format("0.0a")}`) 
                        .classed("country-name", true)
                        // .style("fill", "#767676") 
                        .classed("country-name--number", true)
                        .style("fill", palette.highlightDark)
                  }

                  if(showExports) {
                    // .style("font-size", "14px")

                    const label2 = layer3.append("text")
                        .style("text-anchor", "middle")
                        .attr("x", start[0])
                        .attr("y", (showImports) ? start[1] + 42 : start[1] + 26)
                        .text(`E: $${numeral(Number(datumExports.Value)*1000).format("0.0a")}`) 
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