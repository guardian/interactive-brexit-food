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

const width = 1260
const height = 800

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

const layer1 = svg.append("g")
const layer2 = svg.append("g")
const layer3 = svg.append("g")


Promise.all([d3Fetch.json("https://interactive.guim.co.uk/docsdata-test/1kO5_S91NCP37AF5TOsrVZIIIdzbFsftnq66m5cokKtA.json"),d3Fetch.csv("<%= path %>/assets/trade_eu.csv")]).then(data => {
    const centroids = data[0].sheets.Sheet1;
    const item = "Potatoes, frozen";
    const ukCentroid = centroids.find(b => b.name === "United Kingdom");
    const ukCentroidProjected = proj([Number(ukCentroid.longitude), Number(ukCentroid.latitude)]);

    const imports = data[1].filter(d => d.Element === "Import Value").filter(d => d.Value != "0")

    const toMap = imports.filter(d => d.Item === item);

    svg.append("text")
      .text(item)
      .attr('x', 0)
      .attr("y", 48)
      .classed("big-label", true)

    const liner = d3.line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveBasis);

    const rScale = d3.scaleSqrt().domain(d3.extent(imports, d => d.Value)).range([0.5, 40]).clamp(true);
    // console.log(d3.extent(imports, d => d.Value))
    fc.features.forEach(f => {
        if(euCountries.filter(c => c === f.name).length > 0) {
            let centroid = centroids.find(b => b.name === f.name);
            // console.log(centroid)

            const datum = toMap.find(d => d["Partner Countries"] === f.name);
            if(datum && centroid) {
                // svg.append("circle")
                //     .attr("cx", proj([Number(centroid.longitude), Number(centroid.latitude)])[0])
                //     .attr("cy", proj([Number(centroid.longitude), Number(centroid.latitude)])[1])
                //     .attr("r", rScale(datum.Value))
                //     .attr("id", "c-" + f.name)
                //     .style("fill", "rgba(0,0,0,0.5)")
                //     .style("stroke", "rgba(0,0,0,0.75)");

                // svg.append("line")
                //     .attr("x1", proj([Number(centroid.longitude), Number(centroid.latitude)])[0])
                //     .attr("y1", proj([Number(centroid.longitude), Number(centroid.latitude)])[1])
                //     .attr("x2", ukCentroidProjected[0])
                //     .attr("y2", ukCentroidProjected[1])
                //     .style("fill", "none")
                //     .style("stroke", "red")
                //     .style("stroke-width", rScale(datum.Value));

                const start = proj([Number(centroid.longitude), Number(centroid.latitude)]);
                const end = ukCentroidProjected;
                const radius = 40;
                // console.log(rScale(datum.Value))

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
                    .transition()
                    .delay(5000)
                    .duration(1000)
                    .style("stroke-width", 100)

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

                // function pathTween(circle, path){
                //     var length = path.node().getTotalLength(); // Get the length of the path
                //     var r = d3.interpolate(0, length); //Set up interpolation from 0 to the path length

                //     return function(t){
                //         var point = path.node().getPointAtLength(r(t)); // Get the next point along the path
                //         // console.log(point, path.node(), circle);
                //         d3.select(circle) // Select the circle
                //             .attr("cx", point.x) // Set the cx
                //             .attr("cy", point.y) // Set the cy
                //     }
                // }

                // svg.append("circle")
                //     .attr("cx", proj([Number(centroid.longitude), Number(centroid.latitude)])[0]) //Starting x
                //     .attr("cy", proj([Number(centroid.longitude), Number(centroid.latitude)])[1]) //Starting y
                //     .attr("r", 10)
                //     .transition()
                //     .delay(250)
                //     .duration(1000) 
                //     .ease(d3.easeLinear)
                //     .tween("pathTween", function() { return pathTween(this, path);})

                // console.log(rScale(datum.Value))
            } else {
                // console.log(toMap, f.name, centroid);
            }
        } else {
            // return "#f6f6f6"
        }
    });
});