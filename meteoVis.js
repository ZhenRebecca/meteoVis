/***
* Simple script to visualise meteorological data for the KNMI
* Information Visualisation course UvA
* Thomas van Dam, 10002918
* UvAnet ID: 6292186
***/

// Dimensions of the svg
var margin = {top: 40, right: 30, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

// Pollute the global namespace
var chart;
var x;
var y;
var yAxis;
var pointer = 0;

// 
var dataFinal = [];
var yearsArray = [];

// Load and process data
d3.csv("meteo.csv", function (data) {

  // Restructure the data a little
  var dataTemp = {};

  data.map(function (d) {
    // Check whether year is already in json, if not add it
    if (!dataTemp.hasOwnProperty(d.year)) {
      dataTemp[d.year] = {};
    }

    // Check whether the month is already in the year, if not add it
    if (!dataTemp[d.year].hasOwnProperty(d.month)) {
      dataTemp[d.year][d.month] = [];
    }

    // Add temperature to the array in the json (e.g. data.2011.01 = [...])
    dataTemp[d.year][d.month].push(+d.temperature);
    
  });

  // Loop through all the keys in the json (i.e. all the years )
  for (var year in dataTemp) {
    if (dataTemp.hasOwnProperty(year)) {

      // Add the 'name' of the year to an array for displaying above the graph
      yearsArray.push(year);

      // Store the averages of all months in an array
      var avrgMonth = [];
      for (var month in dataTemp[year]) {
        if (dataTemp[year].hasOwnProperty(month)) {

          // Calculate average
          var sum = 0;
          for (var i = dataTemp[year][month].length - 1; i >= 0; i--) {
            sum += dataTemp[year][month][i];
          }
          var average = sum / dataTemp[year][month].length;

          // Round degrees and place it in the right index (order not fixed)
          avrgMonth[+month - 1] = average / 10;
        }
      }

      // Store averages over a year as an array
      // Data now looks like this: data.2011 = [6.9, 18.2, ...]
      dataTemp[year] = avrgMonth;
    }
  }

  // Sort the years in ascending order
  yearsArray.sort(function (a, b) {
    return a - b;
  });

  // Make the final data structure an array
  // Data now looks like this: data = [[6.9, 18.2, ...], [...], [...], ...]
  for (var i = yearsArray.length - 1; i >= 0; i--) {
    dataFinal[i] = dataTemp[yearsArray[i]];
  };

  // Set the label at the top of the graph to the first year entry
  d3.select(".yearLabel").text(yearsArray[pointer]);

  // Draw that graph
  drawGraph(dataFinal[pointer]);
});

function drawGraph (data) {

  // Array containing months (not pretty but gets the job done)
  var monthsArray = ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

  // X-scale and X-axis with month labels
  x = d3.scale.ordinal()
    .domain(monthsArray.map(function (d, i) { return i; }))
    .rangeRoundBands([0, width], .1);

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickFormat(function (d, i) {
      return monthsArray[i];
    });

  // Y-scale and axis
  computeYscale(data);
  
  // Draw the actual graph
  chart = d3.select(".chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  chart.append("g")
      .attr("class", "y axis")
      .call(yAxis);

  chart.selectAll(".bar")
      .data(data)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function (d, i) { return x(i); })
      .attr("y", function (d) { return y(Math.max(0, d)); })
      .attr("height", function (d) { return Math.abs(y(0) - y(d)); })
      .attr("fill", function (d) {
        return (d < 0) ? "red" : "steelblue";
      })
      .attr("width", x.rangeBand());

  chart.selectAll(".barText")
      .data(data)
    .enter().append("text")
      .attr("class", "bartext")
      .attr("text-anchor", "top")
      .attr("fill", "black")
      .text(function (d){
           return Math.round(d * 10) / 10;
      })
      .attr("x", function (d,i) {
          return x(i) + (x.rangeBand() / 2) - (this.getBBox().width / 2);
      })
      .attr("y", function (d,i) {
          return y(Math.max(0, d) + 0.5);
      });

}

// Compute the Y scale and axis, who'd have known
function computeYscale (data) {
  // Make sure that the Y-scale runs from 0 or lower
  var lowest = d3.min(data, function (d) { return d; });
  if (lowest > 0) {
    lowest = 0;
  };

  // Create scale and axis
  y = d3.scale.linear()
    .domain([lowest, d3.max(data, function (d) { return d; })])
    .range([height, 0]);

  yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");
}

// Advance a year by pressing right, or go back by pressing left
d3.select("body").on("keydown", function () {
  // Process input, only trigger on left or right
  if (d3.event.keyCode == 37) {
    pointer--;
    if (pointer < 0) {
      pointer = dataFinal.length - 1;
    };
  } else if (d3.event.keyCode == 39) {
    pointer++;
    if (pointer >= dataFinal.length) {
      pointer = 0;
    };
  } else {
    return;
  }

  // Recompute and redraw the Y-scale
  computeYscale(dataFinal[pointer]);
  chart.select(".y.axis").transition().call(yAxis);

  // Transform the bars
  chart.selectAll(".bar")
    .data(dataFinal[pointer])
    .transition()
    .attr("y", function (d) { return y(Math.max(0, d)); })
    .attr("height", function (d) { return Math.abs(y(0) - y(d)); })
    .attr("fill", function (d) {
      return (d < 0) ? "red" : "steelblue";
    });

  // Transform the labels
  chart.selectAll(".barText")
    .data(dataFinal[pointer])
    .transition()
    .text(function(d){
         return Math.round(d * 100) / 100;
    })
    .attr("x", function (d,i) {
        return x(i) + (x.rangeBand() / 2) - (this.getBBox().width / 2);
    })
    .attr("y", function (d,i) {
        return y(Math.max(0, d) + 0.5);
    });

  // Update the label on top displaying the year
  d3.select(".yearLabel").text(yearsArray[pointer]);
})