$(document).ready(function(){
  $(".btn").click(function(){
    $("div#devops_url_editor-" + $(this).val()).dialog({modal: true,  width: 470});
  });
});
