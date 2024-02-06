export function uiSpinner(context) {
    var osm = context.services.osm;


    return function(selection) {
        var img = selection
            .append('img')
            .attr('src', context.asset('img/loader-black.gif'))
            .style('opacity', 0);

        if (osm) {
            osm
                .on('loading.spinner', function() {
                    img.transition()
                        .style('opacity', 1);
                })
                .on('loaded.spinner', function() {
                    img.transition()
                        .style('opacity', 0);
                });
        }
    };
}
