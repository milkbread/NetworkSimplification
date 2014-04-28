function Toolbar(container, groups, heading_) {
	var self = this;
	var heading = typeof heading_ !== 'undefined' ? heading_ : "Toolbar";

	var toolbar = container.append("div");

	toolbar.append("h1").text(heading);

	var toolbarElements = toolbar.selectAll("input")
		.data(groups)
		.enter().append("div");

	toolbarElements.append("input")
		.attr("type", "checkbox")
		.attr("id", function(d) { return d.name; })
		.property("checked", true)
		.on("change", function(d) {
			if (d3.select(this).property("checked")) {
				d.group.attr("visibility", "visible")
			} else {
				d.group.attr("visibility", "hidden")
			}
		})
	toolbarElements.append("label")
		.text(function(d) { return d.description; })
		.attr("for", function(d) { return d.name; })
}