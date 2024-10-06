let strengthValue = 1;
let collideValue = 18;
let chargeValue = 0;
let selectedValue = d3.select('input[name="nodeSize"]:checked').node().value;
updateVisualization();

function updateParameters() {
    const linkStrengthInput = d3.select("#linkStrength");
    const linkStrengthValue = parseFloat(linkStrengthInput.property("value"));
    strengthValue = (linkStrengthValue >= 0 && linkStrengthValue <= 1) ? linkStrengthValue : 1;

    const collideForceInput = d3.select("#collideForce");
    const collideForceValue = parseFloat(collideForceInput.property("value"));
    collideValue = isNaN(collideForceValue) ? 18 : collideForceValue;

    const chargeForceInput = d3.select("#chargeForce");
    const chargeForceValue = parseFloat(chargeForceInput.property("value"));
    chargeValue = isNaN(chargeForceValue) ? 0 : chargeForceValue;

    selectedValue = d3.select('input[name="nodeSize"]:checked').node().value;

    updateVisualization();
}


d3.select("#linkStrength").property("value", "1").dispatch("input");
d3.select("#collideForce").property("value", "18").dispatch("input");
d3.select("#chargeForce").property("value", "0").dispatch("input");


d3.select("#linkStrength").on("input", updateParameters);
d3.select("#collideForce").on("input", updateParameters);
d3.select("#chargeForce").on("input", updateParameters);

d3.selectAll('input[name="nodeSize"]').on("change", updateParameters);
    

function updateVisualization() {
    const DATA_URL = "./data/co_authorship_data.json";
    const SVG_CONTAINER_ID = "#visualization svg";

    d3.json(DATA_URL).then(function (data) {
        const nodes = data.nodes;
        const edges = data.links;

        const svg = d3.select(SVG_CONTAINER_ID);
        const width = parseInt(svg.attr("viewBox").split(" ")[2]);
        const height = parseInt(svg.attr("viewBox").split(" ")[3]);

        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", zoomed);

        svg.call(zoom);

        const mainGroup = svg.append("g");

        const chargeForce = d3.forceManyBody().strength(chargeValue);

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(edges).id(d => d.id).strength(strengthValue))
            .force("charge", chargeForce)
            .force("collide", d3.forceCollide(collideValue))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const nodeSize = d3.scaleSqrt()
            .domain([0, d3.max(nodes, d => d.citations * 1)])
            .range([4, 20]);

        const link = mainGroup.selectAll(".link")
            .data(edges)
            .enter().append("line")
            .attr("class", "link")
            .style("stroke", "grey")
            .attr("stroke-width", 1.5);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        const node = mainGroup.selectAll(".node")
            .data(nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("fill", d => colorScale(d.country))
            .style("pointer-events", "all")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        node.append("text")
            .attr("dx", 8)
            .attr("dy", ".35em")
            .style("font-size", "10px")
            .text(d => d.authors)
            .attr("text-anchor", "middle");

        let scale;

        if (selectedValue === "publications") {
            const authorPublicationsMap = new Map();

            nodes.forEach(node => {
                const authors = node.authors.split(';');
                authors.forEach(author => {
                    const trimmedAuthor = author.trim();
                    authorPublicationsMap.set(trimmedAuthor, (authorPublicationsMap.get(trimmedAuthor) || 0) + 1);
                });
            });

            scale = d3.scaleSqrt()
                .domain([0, d3.max(Array.from(authorPublicationsMap.values()))])
                .range([4, 20]);

            node.transition().duration(500)
                .attr("r", d => {
                    const authors = d.authors.split(';');
                    let totalPublications = 0;
                    authors.forEach(author => {
                        const trimmedAuthor = author.trim();
                        totalPublications += authorPublicationsMap.get(trimmedAuthor) || 0;
                    });
                    return scale(totalPublications);
                });
        } else if (selectedValue === "degree") {
            nodes.forEach(node => {
                node.degree = edges.filter(edge => edge.source === node.id || edge.target === node.id).length;
            });
            const maxDegree = d3.max(nodes, d => d.degree);
            const nodeSizeScale = d3.scaleSqrt()
                .domain([0, maxDegree])
                .range([4, 10]);
            node.attr("r", d => nodeSizeScale(d.degree));
        } else {
            node.attr("r", d => nodeSize(d.citations));
        }

        function zoomed(event) {
            mainGroup.attr("transform", event.transform);
        }

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        function ticked() {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        }

        simulation.on("tick", ticked);

        function onClickAuthorDetails(author) {
            d3.select("#authorName").text('Author Names: ' + author.authors);
            d3.select("#authorTitle").text('Title: ' + author.title);
            d3.select("#authorCountry").text('Country: ' + author.country);
            d3.select("#authorYear").text('Year: ' + author.year);
        }

        node.on('click', function (event, d) {
            onClickAuthorDetails(d);
        });
    });
}


    