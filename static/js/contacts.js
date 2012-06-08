/**
 * Add timeline to top of dashboard if event data is present.
 * The numbers indicate remaining days.
 * Red numbers indicate close deadlines.
 * Clicking on the numbers displays all event information.
 */
$(document).ready(function() {
  $(".contact-name").each(function() {
    var el = $(this);
    var toggle = el.prev();
    toggle.css("cursor", "pointer");
    toggle.css("padding", "5px");

    var info = el.next();
    if (!el.hasClass("on-call")) {
      info.hide();
    } else {
      toggle.text("\u25BC");
    }
    info.css("padding", "5px");

    toggle.click(function() {
      var toggle = $(this);
      var info = toggle.next().next();
      info.toggle();
      if (info.css("display") === "none") {
        toggle.text("\u25B6");
      } else {
        toggle.text("\u25BC");
      }
    });
  });

  var contacts_header = $("#contacts-header");
  contacts_header.css("cursor", "pointer");
  contacts_header.css("padding", "5px");
  contacts_header.click(function() {
    var contact = $(this).next().children().children();
    var infos = contact.children("ul");
    var plus = contact.children(".plus");
    if ($(this).text() === "Contacts \u25B6") {
      infos.css("display", "block");
      plus.text("\u25BC");
      $(this).text("Contacts \u25BC");
    } else {
      infos.css("display", "none");
      plus.text("\u25B6");
      $(this).text("Contacts \u25B6");
    }
  });
});
