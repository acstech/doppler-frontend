$(document).ready(function(){
  displayTime();
  var button = '.menu-toggle';
  var open = false;

  // add event listener on the menu button to open and close the menu tab
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

// tim's sidebar
// $("#sidebar-wrapper").slideReveal({
//   trigger: $("#toggle"),
//   push: false,
//   overlay: true
// });
