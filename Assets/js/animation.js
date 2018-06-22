'use strict'
$(document).ready(function(){
  displayTime();
  var button = '.menu-toggle';
  var open = false;
  // add event listener onn the menu button to open and close the menu tab
    $(button).click(function(){
      if (!open) {
        $(button).css({
         '-moz-transform':'rotate(90deg)',
         '-webkit-transform':'rotate(90deg)',
         '-o-transform':'rotate(90deg)',
         '-ms-transform':'rotate(90deg)',
         'transform':'rotate(90deg)'
        });
      } else {
        $(button).css({
           '-moz-transform':'rotate(0deg)',
           '-webkit-transform':'rotate(0deg)',
           '-o-transform':'rotate(0deg)',
           '-ms-transform':'rotate(0deg)',
           'transform':'rotate(0deg)'
        });
      }
    open = !open;
  });
});

// addEvents takes in an array and outputs each element as a button for the user to click
function addEvents( events ) {
  var allBtn = '<div class="btn-group btn-toggle"> <button class="btn btn btn-default active event" id="All" style="width:55px">All</button><button class="btn btn btn-primary event" id="None" style="width:55px">None</button></div>'
  $('div.pull-left').append(allBtn);
  $.each(events, function( index, value ) {
    $('div.pull-left').append('<div><button id="' + value + '" class="btn btn-success event opt" style="width:110px; padding-bottom: 10px">' + value + '</button></div>');
  });
  // add event listener for a click
  $('button.event').click(function(){
    toggleEvent(this);
  });
}

// toggleEvent determines what to do with an event based on the id of the event clicked
function toggleEvent( eventButton ) {
  // if the id is all, check to see if the button is 'active' or not
  if ( eventButton.id == 'All') {
    // make all event option buttons green
    $('button.event.opt').removeClass('btn-danger').addClass('btn-success');
  } else if ( eventButton.id == 'None') {
    // make all event option buttons red
    $('button.event.opt').removeClass('btn-success').addClass('btn-danger');
  } else {
    // the button should only change itself by changing from 'active' to inactive or vice-versa
    $(eventButton).toggleClass('btn-success').toggleClass('btn-danger');
    // 'deactivate' All if one of the buttons is toggled to 'inactive' otherwise check to see if all buttons
    // except All are selected
    if (eventButton.className.indexOf('danger') >= 0) {
      $('button#None.event').addClass('active');
      $('button#All.event').removeClass('active');
    } else {
      // check to see if any button is 'inactive'
      if ($('button.event.btn-danger').length == 0) {
        $('button#All.event').addClass('active');
        $('button#None.event').removeClass('active');
      }
    }
  }
  sendActiveEventList();
}

// sendActiveEventList
function sendActiveEventList() {
  var events = {'filter':[]};
  // determine if there is an 'active'
  if ($('button.event.btn-success').length > 0 ) {
    // collect all id's for the events that are 'active'
    $.each($('button.event.btn-success'), function( index, value ) {
      if (value.id != 'All') {
        events.filter.push(value.id);
      }
    });
  }
  // send the the events to the server
  ws.send(JSON.stringify(events));
}

// this function displays the live time on the page
function displayTime() {
    function checkTime(i) {
        return (i < 10) ? "0" + i : i;
    }
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var monthsArray = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    function startTime() {
        var today = new Date(),
            month = monthsArray[today.getMonth()];
            var dateFrontEnd = today.getDate(); // not sure why I had to redeclare the varibles here
            var year = today.getFullYear();
            var wd = days[today.getDay()];
            var h = checkTime(today.getHours()),
                m = checkTime(today.getMinutes()),
                s = checkTime(today.getSeconds());
            $("#time").html(wd + " " + month + " "+ dateFrontEnd + " " + year + ": " + " "
              + h + ":" + m + ":" + s);

          var t = setTimeout(function () {
            startTime()
        }, 500);
    }
    startTime();
};

// listeners for updating the all and none buttons
$('.btn-toggle').click(function() {
  $(this).find('.btn').toggleClass('active');  
  
  if ($(this).find('.btn-primary').length>0) {
    $(this).find('.btn').toggleClass('btn-primary');
  }
  if ($(this).find('.btn-danger').length>0) {
    $(this).find('.btn').toggleClass('btn-danger');
  }
  if ($(this).find('.btn-success').length>0) {
    $(this).find('.btn').toggleClass('btn-success');
  }
  if ($(this).find('.btn-info').length>0) {
    $(this).find('.btn').toggleClass('btn-info');
  }
  
  $(this).find('.btn').toggleClass('btn-default');
     
});

$('form').submit(function(){
var radioValue = $("input[name='options']:checked").val();
if(radioValue){
   alert("You selected - " + radioValue);
 };
  return false;
});