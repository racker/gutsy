$(document).ready(function(){
  $(".btn").click(function(){
    $("div#devops_url_editor-" + $(this).val()).dialog({modal: true, width: '256px'});
  });
});

$(document).ready(function(){
  $(".dialog").click(function(){
    var node = $(this).children("div:hidden");
    $(node).val().dialog({modal: true, width: '256px'});
  });
});
