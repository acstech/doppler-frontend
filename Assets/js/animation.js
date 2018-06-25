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
    $(button).toggleClass('open');
    open = !open;
  });

  // add listener for the form being submitted
  $('form').submit(function(){
    var radioValue = $("input[name='options']:checked").val();
    if(radioValue){
       alert("You selected - " + radioValue);
     };
      return false;
    });
});

/**
 * addEvents takes in an array and outputs each element as a button for the user to click
 * @param events is the list pof events to be appended as the user's filtering options
 */
function addEvents( events ) {
  var allBtn = '<div class="checkbox switcher"><label for="All"><input type="checkbox" id="All" value="" checked><span><small></small></span></label></div>'
  $('div.pull-left').append(allBtn);
  $.each(events, function( index, value ) {
    $('div.pull-left').append('<div><button id="' + value + '" class="btn btn-success opt">' + value + '</button></div>');
  });
  // add event listener for a click
  $('div.pull-left button, div.pull-left input ').click(function(){
    toggleEvent(this);
  });
}

/**
 * toggleEvent determines what to do with an event based on the id of the event clicked
 * and sends the updated filter list over the websocket
 * @param eventButton is the button that was clicked by the user
 */
function toggleEvent( eventButton ) {
  // if the id is all, check to see if the button is 'active' or not
  if ( eventButton.id == 'All') {
    // check to see if all buttons are to be turned on or off
    if ( eventButton.checked) {
       // make all event option buttons green
      $('button.opt').removeClass('btn-danger').addClass('btn-success');
    } else {
      $('button.opt').removeClass('btn-success').addClass('btn-danger');
    }

  } else {
    // the button should only change itself by changing from 'active' to inactive or vice-versa
    $(eventButton).toggleClass('btn-success').toggleClass('btn-danger');
    // 'deactivate' All if one of the buttons is toggled to 'inactive' otherwise check to see if all buttons
    // except All are selected
    if (eventButton.className.indexOf('danger') >= 0) {
      $('input#All').prop( "checked", false );
    } else {
      // check to see if any button is 'inactive'
      if ($('button.opt.btn-danger').length == 0) {
        $('input#All').prop( "checked", true );
      }
    }
  }
  sendActiveEventList();
}

/**
 *  sendActiveEventList checks to see which events to send back as active
 */
function sendActiveEventList() {
  var events = {'filter':[]};
  // determine if there is an 'active'
  if ($('button.opt.btn-success').length > 0 ) {
    // collect all id's for the events that are 'active'
    $.each($('button.opt.btn-success'), function( index, value ) {
        events.filter.push(value.id);
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
