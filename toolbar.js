function Toolbar(container, groups) {
	var self = this;

	var toolbar = container.append("div");

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