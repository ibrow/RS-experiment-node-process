#!/usr/local/bin/node
/**
 * Experiments with Process and Children
 * Parent process
 * This is a really simple script that spawns a bunch of children
 *  and tries to control them
 * As we are trying to simulate a daemon, this parent runs in a
 *  never ending loop - can only be killed by us or by init.d
 **/
/********************************************************************************/
/** Required files **/
/********************************************************************************/
var spawn = require('child_process').spawn;
var fs = require('fs');

/********************************************************************************/
/** Global variables **/
/********************************************************************************/
/** @var int sleep time between each "tick" of the loop **/
var LOOP_SLEEP_TIME = 1000;

/** @var Total number of children to spawn **/
var TOTAL_CHILDREN = 5;

/** @var Array of children **/
var children = new Array(TOTAL_CHILDREN);

/** @var pid_file location to the PID file eg /var/run/parent.js.pid **/
var pid_file = '/tmp/parent.js.pid';

/** @var loop - holds the reference to the main loop interval **/
var loop = undefined;


/********************************************************************************/
/** Functions **/
/********************************************************************************/
/**
 * Sets up the script - write the PID file
 **/
var setup = function() {
   // create the pid file
   var pid = ""+process.pid; // need to turn into a string
   fs.writeFile(pid_file, pid, function (err) {
      if (err) throw err;
      console.log('PID file saved');
   });
}
/**
 * Cleans up on exiting the script - delete the PID file
 **/
var teardown = function() {
   // ensure no more "ticks"
   clearInterval(loop);
   console.log("Cleared loop");

   // kill the PID file, synchronous
   fs.unlink(pid_file);
   console.log('successfully deleted '+pid_file);

   // kill all children!
   for(i=0; i<TOTAL_CHILDREN; i++) {
      if(children[i] != undefined) {
         console.log("Kill child "+i);
         children[i].kill();
      }
   }
}

/**
 * Main function, handles to control loop
 **/
var main = function() {
   // Main functional loop, executed ever 1 second
   loop = setInterval(function() {
      // for each child worker
      for(i=0; i<TOTAL_CHILDREN; i++) {
         if(children[i] == undefined) {
            spawn_child(i);
         }
      }
   }, LOOP_SLEEP_TIME);
}


/**
 * Function which controls the children
 * Spawns the child and sets up the logging and
 * exiting functionalities
 **/
var spawn_child = function(i) {
   console.log('Spawning child, number: '+i);

   // spawn the child
   children[i] = spawn('node', [__dirname+'/child.js']);
   console.log('Child '+i+' spawned, pid: '+children[i].pid);

   // if we get any data from the child, simply output it
   children[i].stdout.on('data', function (data) {
      // note: using process.stdout.write and not console.log here so
      // we don't get a double newline outputted
      process.stdout.write('Child '+i+' ('+children[i].pid+'): ' + data);
   });

   // note: using process.stdout.write and not console.log here because:
   // a) as above, we don't want the double newline outputted
   // b) normally would log this, but this is a test, so just output to console
   children[i].stderr.on('data', function (data) {
      console.stdout.write('Child Error: '+i+' ('+children[i].pid+'): ' + data);
   });

   // if we detect the child has quite, we want ensure we have cleaned
   // everything we need to up
   children[i].on('exit', function (code) {
      children[i] = undefined;
      console.log('Child: '+i+' exited: '+code);
   });
}

/********************************************************************************/
/** Listeners on the main process **/
/********************************************************************************/

/**
 * detect and report if parent exited
 **/
process.on("exit", function() {
   console.log("Parent exiting");
   teardown();
});

/**
 * detect and report if parent was killed
 **/
process.on("SIGTERM", function() {
   console.log("Parent SIGTERM detected");
   // exit cleanly
   process.exit();
});

/********************************************************************************/
console.log("Starting parent "+process.pid);
// setup the script
setup();
// start main loop, this is infinite
main();