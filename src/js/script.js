import chartData from '../data/chart_data';
import ChartController from './ChartController';


class Chart1 {

	constructor(data){

		this.data = new ChartData(data);

		this.layout = new ChartTemplate({
			chart: this
		});

		this.layout.init();

		this.displayedDates = [];

		this.displayedValues = [];


	}

	getChartMinMaxValueInRange(start, end){

		let min = 99999999999999999;
		let max = 0;

		if (this.data.activeLinesCount === 0){
			// Prevent the not smooth animation on disable last chart
			return {min: 0, max: this.viewBoxWidth};
		}

		for (let coordIndex in this.x){
			if (this.x[coordIndex] >= start && this.x[coordIndex] <= end){
				for (let lineIndex in this.lines){
					const line = this.lines[lineIndex];
					if (line.active){
						min = line.coords[coordIndex] < min ? line.coords[coordIndex] : min;
						max = line.coords[coordIndex] > max ? line.coords[coordIndex] : max;
					}
				}
			}else{
				for (let lineIndex in this.lines){
					const line = this.lines[lineIndex];
					if (line.active){
						min = line.coords[coordIndex] < min ? line.coords[coordIndex] : min;
					}
				}
			}
		}

		const range = max - min;

		max += range * 0.05;

		if (min > 0 && (min - range * 0.05) < 0){
			min = 0;
		}else{
			min -= range * 0.05;
			min = Math.floor(min / this.convert(min)) * this.convert(min);
		}

		return {min, max};
	}





	// get order of magnitude
	getOOM(n) {
		if (Math.abs(n) > 0){
			const order = Math.floor(Math.log(Math.abs(n)) / Math.LN10 + 0.000000001);
			return Math.pow(10,order);
		}else{
			return 0;
		}
	}

	drawDates(target, start, end){

		const monthNames = [
			"Dec", "Jan", "Feb", "Mar",
			"Apr", "May", "Jun", "Jul",
			"Aug", "Sep", "Oct",
			"Nov"
		];


		const range = this.x.slice();
		const totalStartDate = range.shift();
		const totalEndDate = range.pop();


		if (!this.layout.controlsState.mapRangeClicked){

			const windowWidthDrawsCount = Math.floor((target.getBoundingClientRect().width) / 80);

			let myltiple = Math.floor((target.querySelector('.chart-wrapper').getBoundingClientRect().width / target.getBoundingClientRect().width) * 1.3);


			myltiple = Math.pow(2, Math.floor(Math.log2(myltiple)));

			const totalDrawsCount = windowWidthDrawsCount * myltiple;

			const step = Math.floor((totalEndDate - totalStartDate) / totalDrawsCount);

			this.displayedDates = [];

			const currentDatesClasses = [];

			for (let i = 0; i <= totalDrawsCount; i++){
				const dateValue = Math.floor((totalStartDate + (step * i)) / 86400000) * 86400000;
				currentDatesClasses.push(`date-${dateValue}`);
				this.displayedDates.push(dateValue);
			}

			this.displayedDates.push(Math.floor((totalEndDate) / 86400000) * 86400000);

			this.layout.removeItems('date-text', currentDatesClasses, 'hide');

		}


		for (const date of this.displayedDates){

			const x = (1 - ((end - date) / (end - start))) * this.viewBoxWidth;

			const shift = (1 - (totalEndDate - date) / (totalEndDate - totalStartDate));

			let text = target.querySelector(`.date-${date}`);

			if (text === null){
				text = document.createElementNS('http://www.w3.org/2000/svg','text');

				const dateValue = new Date(date);
				text.innerHTML = `${monthNames[dateValue.getMonth()]} ${dateValue.getDate()}`;
				text.setAttribute('y', this.viewBoxWidth * (target.clientHeight / target.clientWidth));
				text.setAttribute('width', `50px`);

				text.dataset.date = date;

				target.querySelector('.dates-wrapper').appendChild(text);
			}

			text.setAttribute('x', x - (shift * text.getBoundingClientRect().width * (this.viewBoxWidth / this.layout.chartWindow.clientWidth)));
			text.setAttributeNS(null, 'class', `date-${date} date-text active-item`);
		}

	}

	drawValues(target, chartValuesMinMax){

		const range = chartValuesMinMax.max - chartValuesMinMax.min;

		const countValuesToDisplay = Math.floor(target.clientHeight / 60);

		const stepNotRounded = range / countValuesToDisplay;

		const stepOrder = this.convert(stepNotRounded);

		const step = Math.floor(stepNotRounded / stepOrder) * stepOrder;

		const steps = [];

		const currentStepsClasses = [];

		const min = (chartValuesMinMax.min > step && chartValuesMinMax.min > 0) ? chartValuesMinMax.min : 0;

		for (let i = 0; i <= countValuesToDisplay; i++){
			const value = (step * i) + min;
			steps.push(value);
			currentStepsClasses.push(`value-${value}`);
		}

		this.layout.removeItems('value-item', currentStepsClasses, 'hide');

		for (const value of steps){

			const y = ((((range - (value - chartValuesMinMax.min)) / range) * (this.viewBoxWidth * 0.93))) * (target.clientHeight / target.clientWidth);


			let text = target.querySelector(`.value-${value}-value`);

			let path = target.querySelector(`.value-${value}-text`);

			if (path === null){

				path = document.createElementNS('http://www.w3.org/2000/svg','path');

				path.setAttributeNS(null, 'stroke', '#f2f4f5');
				path.setAttributeNS(null, 'stroke-width', this.viewBoxWidth * 0.001);
				path.setAttributeNS(null, 'fill', 'none');

				target.querySelector('.values-wrapper').appendChild(path);
			}

			path.setAttributeNS(null, 'd', `M${0} ${y} L ${this.viewBoxWidth} ${y}`);
			path.setAttributeNS(null, 'class', `value-item active-item value-${value} value-${value}-value`);

			if (text === null){
				text = document.createElementNS('http://www.w3.org/2000/svg','text');

				text.innerHTML = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
				text.setAttribute('x', 0);
				target.querySelector('.values-wrapper').appendChild(text);
			}

			text.setAttribute('y', (y - target.viewBox.baseVal.height * 0.01));
			text.setAttributeNS(null, 'class', `value-item active-item value-${value} value-${value}-text`);


		}

	}

	drawTooltip(target, {x, values}, clientY = 0){

		if (this.layout.controlsState.chartMove){
			return;
		}


		let start = this.start + ((this.end - this.start) * (this.layout.startChartValue / this.viewBoxWidth));

		let end = this.end - ((this.end - this.start) * (1 - ((this.layout.endChartValue + this.layout.endChartWidth) / this.viewBoxWidth)));


		const xCoord = (1 - ((end - x) / (end - start))) * this.viewBoxWidth;


		const chartValuesMinMax = this.getChartMinMaxValueInRange(start, end);

		const chartHeight = chartValuesMinMax.max - chartValuesMinMax.min;

		let tooltipPath = target.querySelector(`.tooltip-${x}`);

		let tooltipHTML = ``;

		let tooltipText = document.querySelector(`#tooltip-text-${x}`);

		if (tooltipPath === null){

			this.layout.removeItems('tooltip-item', `tooltip-${x}`);

			const monthNames = [
				"Dec", "Jan", "Feb", "Mar",
				"Apr", "May", "Jun", "Jul",
				"Aug", "Sep", "Oct",
				"Nov"
			];

			const weekdaysNames = [
				"Sun", "Mon",
				"Tue", "Wed",
				"Thu", "Fri",
				"Sat"
			];

			const dateValue = new Date(x);



			tooltipHTML += `<span class="tooltip-date">${weekdaysNames[dateValue.getDay()]}, ${monthNames[dateValue.getMonth()]} ${dateValue.getDate()}</span>`;
			tooltipHTML += `<div class="tooltip-values-wrapper">`;

			for (const chartValue of values){

				let circleValue = target.querySelector(`.tooltip-value-${chartValue.y}`);

				const y = ((((chartHeight - (chartValue.y - chartValuesMinMax.min)) / chartHeight) * (this.viewBoxWidth * 0.93))) * (target.clientHeight / target.clientWidth);

				if (circleValue === null){

					circleValue = document.createElementNS('http://www.w3.org/2000/svg','circle');

					circleValue.setAttributeNS(null, 'stroke', chartValue.color);
					circleValue.setAttributeNS(null, 'stroke-width', this.viewBoxWidth * 0.002);
					circleValue.setAttributeNS(null, 'fill', '#fff');
					circleValue.setAttributeNS(null, 'r', this.viewBoxWidth * 0.007);
					circleValue.setAttributeNS(null, 'class', `tooltip-${x} tooltip-value-${chartValue.y} tooltip-item`);

					target.querySelector('.tooltip-wrapper').appendChild(circleValue);

				}

				circleValue.setAttributeNS(null, 'cx', xCoord);
				circleValue.setAttributeNS(null, 'cy', y);
				tooltipHTML += `<div class="tooltip-value-wrapper" style="color: ${chartValue.color}">
					<span class="tooltip-value">${[chartValue.y].toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}</span>
					<span class="tooltip-value-name">${chartValue.name}</span>
				</div>`;

			}

			tooltipHTML += `</div>`;

			if (tooltipText === null){
				tooltipText = document.createElement('div');
				tooltipText.setAttribute('class', `tooltip-text tooltip-${x} tooltip-item`);
				tooltipText.setAttribute('id', `tooltip-text-${x}`);
				this.layout.chartWrapper.appendChild(tooltipText);
			}

			tooltipText.innerHTML = tooltipHTML;

			tooltipPath = document.createElementNS('http://www.w3.org/2000/svg','path');

			tooltipPath.setAttributeNS(null, 'stroke', '#96a2aa');
			tooltipPath.setAttributeNS(null, 'stroke-width', this.viewBoxWidth * 0.001);
			tooltipPath.setAttributeNS(null, 'fill', 'none');

			tooltipPath.setAttributeNS(null, 'class', `tooltip-${x} tooltip-item`);

			tooltipPath.setAttributeNS(null, 'd', `M${xCoord} 0 L ${xCoord} ${100}`);

			target.querySelector('.tooltip-wrapper').appendChild(tooltipPath);

		}

		const bcrChart = this.layout.chartWindow.getBoundingClientRect();
		const bcrTooltip = tooltipText.getBoundingClientRect();
		const bcrCurrentTooltipLine = tooltipPath.getBoundingClientRect();
		const chartY = clientY - bcrChart.top;


		let left = ((bcrCurrentTooltipLine.left - bcrChart.left) - (bcrTooltip.width / 2));
		let top = chartY - (bcrTooltip.height + 15);

		if (left < 0){
			left = (bcrCurrentTooltipLine.left - bcrChart.left) + 15;
			top = chartY - (bcrTooltip.height / 2);

		}
		if ((left + bcrTooltip.width) > bcrChart.width){
			left = (bcrCurrentTooltipLine.left - bcrChart.left) - (bcrTooltip.width + 15);
			top = chartY - (bcrTooltip.height / 2);
		}

		if (top < 0){
			top = chartY + 15;
		}

		if ((top + bcrTooltip.height) > (bcrChart.height - (bcrChart.height * 0.09))){
			top = chartY - (bcrTooltip.height + 15);
		}

		tooltipText.style.top = `${top}px`;
		tooltipText.style.left = `${left}px`;


	}

	drawLines({target, startPercent = 0, endPercent = this.viewBoxWidth, drawValues = false}){

		let start = this.start + ((this.end - this.start) * (startPercent / this.viewBoxWidth));
		let end = this.end - ((this.end - this.start) * (1 - (endPercent / this.viewBoxWidth)));


		const aspectRatioCoeff = target.clientHeight / target.clientWidth;

		target.setAttribute('viewBox', `0 0 ${this.viewBoxWidth} ${this.viewBoxWidth * aspectRatioCoeff}`);

		// Disable zoom less than 100%
		start = this.start > start ? this.start : start;
		end = this.end < end ? this.end : end;
		const chartWidth = (end - start);

		const chartValuesMinMax = this.getChartMinMaxValueInRange(start, end);
		const chartHeight = chartValuesMinMax.max - chartValuesMinMax.min;

		for (let lineId in this.lines){

			let pathLine = '';

			const yCoords = this.lines[lineId].coords;

			for (let coordIndex in this.x){

				coordIndex = Number(coordIndex);
				let x = this.x[coordIndex];
				let y = yCoords[coordIndex];

				x = (1 - ((end - x) / chartWidth)) * this.viewBoxWidth;
				y = ((((chartHeight - (y - chartValuesMinMax.min)) / chartHeight) * (this.viewBoxWidth * 0.93))) * aspectRatioCoeff;


				pathLine += (coordIndex === 0) ? `M${x} ${y}` : ` L ${x} ${y}`;

			}

			let path = target.querySelector(`.line-${lineId}`);

			if (path === null){
				// Create the chart path if it not exists
				path = document.createElementNS('http://www.w3.org/2000/svg','path');
				path.setAttributeNS(null, 'class', `line-${lineId}`);
				path.setAttributeNS(null, 'stroke', this.lines[lineId].color);
				path.setAttributeNS(null, 'stroke-width', this.viewBoxWidth * 0.004);
				path.setAttributeNS(null, 'fill', 'none');
				target.querySelector('.chart-wrapper').appendChild(path);
			}
			path.setAttributeNS(null, 'd', pathLine);
		}

		if (drawValues){
			setTimeout(() => {
				this.drawDates(target, start, end);
				this.drawValues(target, chartValuesMinMax);
			}, 0);
		}
	}
}

class Chart {

	constructor(data){

		this.chart = new ChartController(data);

	}

}



// new ChartController(chartData[0]);
new Chart(chartData[0]);
// new Chart(chartData[1]);
// new Chart(chartData[2]);
// new Chart(chartData[3]);
// new Chart(chartData[4]);
// new Chart(chartData[1]);
// new Chart(chartData[2]);
// new Chart(chartData[3]);
// new Chart(chartData[4]);