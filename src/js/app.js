import * as d3 from "d3"
import * as d3Fetch from "d3-fetch"
import * as d3Projections from "d3-geo-projection"
import world from 'world-atlas/world/50m.json'
import * as topojson from 'topojson'
import geoff from './geoff'
import palette from "./palette"
import * as utils from "./util"

const fc = topojson.feature(world, world.objects.countries) // I always call it 'fc' for 'FeatureCollection'

const euCountries = ["United Kingdom", "Spain", "France", "Germany", "Poland", "Austria", "Portugal", "Luxembourg", "Italy", "Denmark", "Netherlands", "Belgium", "Switzerland", "Czechia", "Croatia", "Cyprus", "Romania", "Bulgaria", "Estonia", "Latvia", "Ireland", "Hungary", "Greece", "Slovakia", "Slovenia", "Sweden"];

console.log(euCountries);

const width = document.querySelector(".interactive-wrapper").clientWidth;
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
                -10.810546875,
                34.74161249883172
              ],
              [
                26.982421875,
                34.74161249883172
              ], 
              [
                26.982421875,
                59.22093407615045
              ],
              [
                -10.810546875,
                59.22093407615045
              ],
              [
                -10.810546875,
                34.74161249883172
              ]
            ].reverse()
          ]
        }
      }
    ]
  };

const proj = d3Projections.geoBonne()
  .fitSize([width, height], bbox)

const path = d3.geoPath()
  .projection(proj)

const svg = d3.select(".interactive-wrapper")
    .append("svg")
    .attr("height", height)
    .attr("width", width)
    .style("overflow", "hidden");

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

Promise.all([d3Fetch.json("https://interactive.guim.co.uk/docsdata-test/1kO5_S91NCP37AF5TOsrVZIIIdzbFsftnq66m5cokKtA.json"),d3Fetch.csv("<%= path %>/assets/trade_eu.csv")]).then(data => {
    const centroids = data[0].sheets.Sheet1;
    const ukCentroid = centroids.find(b => b.name === "United Kingdom");
    const ukCentroidProjected = proj([Number(ukCentroid.longitude), Number(ukCentroid.latitude)]);

    const imports = data[1].filter(d => d.Element === "Import Value").filter(d => d.Value != "0")

    const liner = d3.line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveBasis);

    const rScale = d3.scaleSqrt().domain(d3.extent(imports, d => d.Value)).range([0.5, 40]).clamp(true);

    const animationDuration = 1000;
    
    const draw = item => {
      activeDatavizLayer.transition().duration(animationDuration).style("opacity", 0);
      activeDatavizLayer = (activeName === "1") ? dataviz2 : dataviz1;
      activeName = (activeName === "1") ? "2": "1";
      activeDatavizLayer.html("");

      const layer1 = activeDatavizLayer.append("g")
      const layer2 = activeDatavizLayer.append("g")
      const layer3 = activeDatavizLayer.append("g")

      activeDatavizLayer.append("text")
        .text(item)
        .attr('x', 0)
        .attr("y", 48)
        .classed("big-label", true)

      const toMap = imports.filter(d => d.Item === item);

      fc.features.forEach(f => {
          if(euCountries.filter(c => c === f.name).length > 0) {
              let centroid = centroids.find(b => b.name === f.name);

              const datum = toMap.find(d => d["Partner Countries"] === f.name);
              if(datum && centroid) {
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

                  const path = layer2.append("path")
                      .attr("d", liner([
                          start,
                          mid,
                          end
                        ]))
                        .style("fill", "none")
                      .style("stroke", palette.highlightDark)
                      .style("stroke-width", rScale(datum.Value))
                      .style("stroke-linecap", "square")
                      .classed("animated-line", true)

                  if(f.name !== "Denmark") {    
                    const label = layer3.append("text")
                        .style("text-anchor", "middle")
                        .attr("x", start[0])
                        .attr("y", start[1] + 10)
                        .text(f.name)
                        .classed("country-name", true)
                        .style("font-weight", "bold")
                        // .style("font-size", "14px")

                    const label2 = layer3.append("text")
                        .style("text-anchor", "middle")
                        .attr("x", start[0])
                        .attr("y", start[1] + 26)
                        .text(`$${utils.numberWithCommas(Number(datum.Value)*1000)}`) 
                        .classed("country-name", true)
                        // .style("fill", "#767676") 
                        .classed("country-name--number", true)
                  } else {
                    const label = layer3.append("text")
                        .style("text-anchor", "middle")
                        .attr("x", start[0])
                        .attr("y", start[1] - 24)
                        .text(f.name)
                        .classed("country-name", true)
                        .style("font-weight", "bold")
                        // .style("font-size", "14px")

                    const label2 = layer3.append("text")
                        .style("text-anchor", "middle")
                        .attr("x", start[0])
                        .attr("y", start[1] - 8)
                        .text(`$${utils.numberWithCommas(Number(datum.Value)*1000)}`) 
                        .classed("country-name", true)
                        // .style("fill", "#767676") 
                        .classed("country-name--number", true)
                  }
              } 
          } else {
              // return "#f6f6f6"
          }

          activeDatavizLayer.transition().duration(animationDuration).style("opacity", 1)
      });
    }

    const dropdown = d3.select(".dropdown")
      .append("select");

    const listOfItems = (d3.nest().key(d => d.Item).entries(imports)).map(d => d.key);

    dropdown.selectAll("option")
        .data(listOfItems)
          .enter()
          .append("option")
          .text(d => d)
          .attr("value", d => d)

    dropdown.on("change", function(d) {
      draw(dropdown.node().value)
    })

    draw(listOfItems[0])
});