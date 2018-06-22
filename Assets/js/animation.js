'use strict'
$(document).ready(function(){
  var button = '.menu-toggle';
  var open = false;
  var test = ['sign in', 'Bible study']
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
  addEvents(test);
});

// addEvents takes in an array and outputs each element as a button for the user to click
function addEvents( events ) {
  $('div.pull-left').append('<div><button id="All" class="btn btn-success event" style="width:100px">All</button></div>');
  $.each(events, function( index, value ) {
    $('div.pull-left').append('<div><button id="' + value + '" class="btn btn-success event" style="width:100px">' + value + '</button></div>');
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
    if ( eventButton.className.indexOf('success') >= 0) {
      $('button.event').removeClass( 'btn-success').addClass('btn-danger');
    } else {
      $('button.event').removeClass('btn-danger').addClass('btn-success');
    }
  } else {
    // the button should only change itself by changing from 'active' to inactive or vice-versa
    $(eventButton).toggleClass('btn-success').toggleClass('btn-danger');
    // 'deactivate' All if one of the buttons is toggled to 'inactive' otherwise check to see if all buttons 
    // except All are selected
    if (eventButton.className.indexOf('danger') >= 0) {
        $('button#All.event').removeClass( 'btn-success').addClass('btn-danger');
    } else {
      // check to see if the only button that is 'inactive' is the All button 
      if ($('button.event.btn-danger').length == 1 && $('button.event.btn-danger').attr('id') == 'All') {
        $('button#All.event').removeClass('btn-danger').addClass('btn-success');
      }
    }
  }
}