const WORLD_TOTAL_LABEL = "World Total";

function main()
{
	const chartContext = document.getElementById('graphCanvas').getContext('2d');
	const chartConfig = {
		type: 'line',
		options: {
			responsive: true,
			tooltips: {
				mode: 'index',
				intersect: false,
			},
			scales: {
				xAxes: [{
					display: true,
					scaleLabel: {
						display: true,
						labelString: ""
					}
				}],
				yAxes: [{
					display: true,
					scaleLabel: {
						display: true,
						labelString: "Cases"
					}
				}]
			}
		}
	};
	window.chart = new Chart(chartContext, chartConfig);

	const xhr = new XMLHttpRequest();
	xhr.addEventListener('load', ev => {
		window.dataObject = parseCSV(xhr.response);
		window.history.replaceState({}, "", urlFromState(stateFromUrl()));
		updateFromUrl();
		window.onpopstate = updateFromUrl;
	});
	xhr.open('GET', 'time_series_covid19_confirmed_global.csv');
	xhr.send();
}

function updateFromUrl()
{
	window.state = stateFromUrl();
	updateControls(window.dataObject, window.state);
	updateChart(window.dataObject, window.state);
}

function updateControls(dataObject, state)
{
	const controls = document.getElementById('controls');

	window.checkboxes = [];

	dataObject.countries.forEach((country, i) => {
		const checkedStr = (state.countries.indexOf(country) == -1) ? '' : ' checked="checked"';
		const id = 'check_' + i.toString();
		const htmlStr = '<span class="checkboxes">'
			+ '<input type="checkbox" id="' + id + '" data-country="' + country + '"' + checkedStr + '></input>'
			+ '<label for="' + id + '">' + country + '</label>'
			+ '</span>'

		const temp = document.createElement('template');
		temp.innerHTML = htmlStr;

		controls.appendChild(temp.content.firstChild);

		const checkbox = document.getElementById(id);
		checkbox.onchange = updateAfterChange;
		window.checkboxes.push(checkbox);
	});
}

function urlFromState(state)
{
	const baseUrl = window.location.href.split('?')[0];
	const query = encodeURIComponent(JSON.stringify(state));
	return baseUrl + '?' + query;
}

function stateFromUrl()
{
	let state = {
		countries: [WORLD_TOTAL_LABEL],
	};

	const query = decodeURIComponent(window.location.search.substring(1));
	const urlState = (query === '') ? {} : JSON.parse(decodeURIComponent(window.location.search.substring(1)));

	Object.keys(urlState).forEach(k => state[k] = urlState[k]);

	return state;
}

function updateAfterChange()
{
	const selectedCountries = window.checkboxes.filter(c => c.checked).map(c => c.attributes['data-country'].value);

	window.state.countries = selectedCountries;
	window.history.pushState(null, "", urlFromState(window.state));

	updateChart(window.dataObject, window.state);
}

function updateChart(dataObject, options)
{
	function getColorScheme(numColors) {
		const phi = (Math.sqrt(5) + 1.) / 2.;
		return Array.from(Array(numColors), (_, n) => {
			const hue = (1 + phi * n) % 1.
			return hslToHex(hue, 1, .5);
		});
	}

	function getDataset(country, color) {
		return {
			label: country,
			backgroundColor: color,
			borderColor: color,
			data: dataObject.table[country],
			fill: false,
		}
	}

	if (options.x_axis == '??') {
	} else {
		const pad2 = n => (s => ((s.length < 2) ? ("0" + s) : s)) (n.toString());
		dataLabels = dataObject.dates.map(d => (1900 + d.getYear()) + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()));
		window.chart.options.scales.xAxes[0].scaleLabel.labelString = "Date";
	}

	const colors = getColorScheme(options.countries.length);
	const datasets = options.countries.map((c, i) => getDataset(c, colors[i]));

	window.chart.data = {
		labels: dataLabels,
		datasets: datasets
	};

	window.chart.update();
}

function parseCSV(csv)
{
	const FIRST_DATE_COLUMN = 4;

	const parseDate = dateStr => (sp => new Date(parseInt(sp[2], 10) + 2000, parseInt(sp[0], 10) - 1, parseInt(sp[1], 10))) (dateStr.split("/"));

	const csvTable = Papa.parse(csv).data;

	const header = csvTable[0];
	const days = header.length - FIRST_DATE_COLUMN;
	const dates = header.slice(FIRST_DATE_COLUMN).map(parseDate);

	console.log("Got data for", days, "days starting on", dates[0]);

	const emptyStats = () => Array(days).fill(0);

	var countries = [WORLD_TOTAL_LABEL];
	var table = {};
	table[WORLD_TOTAL_LABEL] = emptyStats();

	function addCountryStats(country, numbers) {
		if (countries.indexOf(country) == -1) {
			countries.push(country);
		}

		if (!table.hasOwnProperty(country)) {
			table[country] = emptyStats();
		}
		cn = table[country];
		table[country] = table[country].map((n, i) => n + numbers[i]);
		table[WORLD_TOTAL_LABEL] = table[WORLD_TOTAL_LABEL].map((n, i) => n + numbers[i]);
	}

	csvTable.slice(1).forEach(row => {
		const country = row[1];
		const numbers = row.slice(FIRST_DATE_COLUMN).map(x => parseInt(x, 10));
		addCountryStats(country, numbers);
	});

	return {
		dates: dates,
		days: days,
		countries: countries,
		table: table,
	};
}

window.onload = main;

// From https://stackoverflow.com/a/44134328
function hslToHex(h, s, l) {
	let r, g, b;
	if (s === 0) {
		r = g = b = l; // achromatic
	} else {
		const hue2rgb = (p, q, t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	const toHex = x => {
		const hex = Math.round(x * 255).toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	};
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
