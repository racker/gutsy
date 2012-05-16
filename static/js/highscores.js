$(document).ready(function(){
  $("#lordly-title").click(function(){
    $("div#title-maker").dialog({modal: true, height: 280, width: 430});
  });

  $("div#title-maker").submit(function(event){
    // do stuff
    return false;
  });
});