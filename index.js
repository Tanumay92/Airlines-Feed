//=======++++Importing Packages++++======
var exp=require('express');
var app=exp();
var body=require('body-parser');
var ejs=require('ejs');
var session=require('express-session');
var db=require('mysql');
var nodemailer = require('nodemailer');
var upload=require('express-fileupload');
var fs=require('fs');
var qpx = require('google-flights-wrapper1')('AIzaSyBm6tov804KxHOISvIVw7HUxYCW5rNTsHA');

//====+++Mailer Settings++=====
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tanumayld@gmail.com',
    pass: 'tanumay92#'
  }
});

//======++++Creating Connection with Mysql++++=====
var con=db.createConnection({
     host:'localhost',
    user:'root',
    password:'admin',
    database:'airlines_feed',
    port:'3306'
});

//-------!!Declaring Dependencies!!-------
app.use(exp.static("upload"));
app.use(upload());
app.use(body.urlencoded({extended:true}));
app.set('view engine','ejs');
app.use(session({
  secret:'secret',
  resave:true,
saveUninitialized:true
}));

//=====+++Serving Login Page+++=====
app.get('/login',function(req,res){
    res.render('userlogin');
});

var hotel_id;
//=====+++Admin Login Check+++====
app.post('/login',function(req,res){
     var u_name=req.body.email;
     var pass=req.body.password;
     var sql="SELECT*FROM users WHERE username="+db.escape(u_name)+" AND password="+db.escape(pass);
     con.query(sql,function(err,fields){
         //var row_count=fields.length();
         var data=fields;
         console.log(data);
         var roow_count=fields.length;
         if(err){
             console.log(err);
         }
         else if(roow_count==1){
             var user_type=data[0].type;
          if(user_type=='SA'){//if(row_count==1){
             req.session.super=fields[0].name;
             res.redirect('/superadmin/dashboard');
         }
          else if(user_type=='AA'){
              req.session.admin=fields[0].name;
              var sql_hotel="SELECT*FROM hotels where admin="+db.escape(u_name);
              con.query(sql_hotel,function(err,fields_hotel){
                  if(err){
                      console.log(err);
                  }
                  else{
                      hotel_id=fields[0].id;
                      console.log(hotel_id);
                  }
              })
              res.redirect('/admin/dashboard');
          }
         }
         else{
             res.render('loginerror');
         }
     })
});

//====+++Forgot Password+++=====
app.get('/superadmin/forgot_password',function(req,res){
    res.render('forgot');
});

//====+++Forgot Password++=====
app.post('/superadmin/forgot_password',function(req,res){
    var email=req.body.email;
    var sql="SELECT*FROM users WHERE Username="+db.escape(email);
    con.query(sql,function(err,fields){
      var row_count=fields.length; 
       if(err){
            console.log(err);
        }
        else if(row_count==1){
            var pass=fields[0].password;
            res.render('confirm');
            var mailOptions = {
  from: 'tanumayld@gmail.com',
  to: email+',tanumay@sugoilabs.com',
  subject: 'Password Request',
  html: 'Your Password is <b><u>'+pass+'</u></b> for the account with email <b>'+email+'</b>'
};

transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
}); 
        }
        {
            res.render('no_match');
        }
    });
});

//====+++Super Admin Home Page+++====
app.get('/superadmin/dashboard',function(req,res){
    if(!req.session.super){
         res.redirect('/login');
    }
    else{
        var sql='SELECT*FROM hotels';
        con.query(sql,function(err,fields){
            if(err){
                console.log(err);
            }
            else{
        res.render('superdashboard',{
             user:req.session.super,    
             fields:fields
        });
            }
        });
    }
});

//=====+++Admin Home Page+++=====
app.get('/admin/dashboard',function(req,res){
      if(!req.session.admin){
          res.redirect('/login');
      }
      else{
          //var hotel_name,email,contact,admin,address
          var sql='Select*from hotels where admin='+db.escape(req.session.admin);
          console.log(sql);
          con.query(sql,function(err,fields_hotel){
              console.log(fields_hotel);
              var status=fields_hotel[0].Status;
              var hotel=fields_hotel[0].Name;
              var id=fields_hotel[0].ID;
              console.log("Hotel ID : "+fields_hotel[0].ID);
              req.session.hotel_id=fields_hotel[0].ID;
              console.log(status);
              if(err){
                  console.log(err);
              }
              else if(status=="Enable"){
                  console.log(fields_hotel);
                  var sql_screens="Select*from screens where Hotel_ID="+db.escape(id);
                  console.log(sql_screens);
                  con.query(sql_screens,function(err,fields_screen){
                      console.log(fields_screen);
                      if(err){
                          console.log(err);
                      }
                      {
                          res.render('admindashboard',{
                             fields:fields_screen,
                             user:req.session.admin
                          });
                      }
                  });
                    }
              else{
                  res.render('account_disable');
              }
          });
      }
});


//====++Add Hotel GET ++=====
app.get('/superadmin/add_hotel',function(req,res){
            res.render('add_hotel');
});

app.post('/superadmin/add_hotel',function(req,res){
    var hotel=req.body.hotel_name;
    var address=req.body.address;
    var contact=req.body.contact;
    var email=req.body.email;
    var admin=req.body.admin;
    var pass=req.body.pass;
    var screens=req.body.screen_no;
    var date=new Date();
    var sql_user_verify="SELECT*FROM users WHERE username="+db.escape(email);
    con.query(sql_user_verify,function(err,fields_verify){
         var return_row=fields_verify.length;
        if(err){
            console.log(err);
        }
           else if(return_row==0){
    values=[[hotel,address,contact,email,screens,'Enable',admin,date,req.session.super,'Disable']];
    var sql_hotel="INSERT INTO hotels(Name,Address,Contact,Email,No_of_Screens,Status,admin,created_at,created_by,status_false) VALUES(?)";
    con.query(sql_hotel,values,function(err,fields_hotel){
       if(err){
           console.log(err);
       }
    else{
        console.log('Hotel Added : '+hotel);
    values2=[[admin,email,pass,'AA',date,req.session.super,'Enable']];
    var sql_admin="INSERT INTO users(name,username,password,type,created_at,created_by) VALUES(?)";
    con.query(sql_admin,values2,function(err,fields_admin){
        if(err){
            console.log(err);
        }
        else{
            console.log('Admin Added : '+admin);
            res.redirect('/superadmin/dashboard');
        }
    });
     var mailOptions = {
  from: 'tanumayld@gmail.com',
  to: email+',tanumay@sugoilabs.com',
  subject: 'Hotel Add',
  html: 'Your Hotel <b>'+hotel+'</b> is added in our portal.<br/> Your login credentials are given in this mail. Please find.<br/><b>Username: <u>'+email+'</u><br/>Password:<u>'+pass+'</u></b><br/> Please Login to your account to change your credentials.'
};

transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
    });
    }
});
}
else{
    res.render('duplicate_user');
}
});
});

//=====++Edit Hotels++=====
var email;
var id;
app.post('/superadmin/update_hotel',function(req,res){
    id=req.body.id;
    email=req.body.email;
    var address=req.body.address;
    var contact=req.body.contact;
    var admin=req.body.admin;
    var screens=req.body.screens;
    console.log(id);

    var sql_hotel="UPDATE hotels set Address="+db.escape(address)+",Contact="+db.escape(contact)+",admin="+db.escape(admin)+",NO_of_Screens="+db.escape(screens)+" Where ID="+db.escape(id);
    console.log(sql_hotel);
    con.query(sql_hotel,function(err,fields){
        if(err){
            console.log(err);
        }
        else{
            var sql_user="Update users set name="+db.escape(admin)+" Where username="+db.escape(email);
            con.query(sql_user,function(err,fields){
                if(err){
                    console.log(err);
                }
                else{
                    res.redirect('/superadmin/dashboard');
                }
            })
        }
    })
});

app.post('/superadmin/disable',function(req,res){
    var id=req.body.id;
    var email=req.body.email;
    var status_dis='Disable';
    var status_dis_false='Enable';
    var sql_check="Select*from hotels where ID="+db.escape(id);
    con.query(sql_check,function(err,fields_ret){
        if(err){
            console.log(err);
        }
        else{
        var status=fields_ret[0].Status;
    if(status=="Enable"){
    var sql_dis="UPDATE hotels set Status="+db.escape(status_dis)+",status_false="+db.escape(status_dis_false)+" where ID="+db.escape(id);
    console.log(sql_dis);
    con.query(sql_dis,function(err,fields){
        if(err){
            console.log(err);
        }
        else{
            var sql_user_en="UPDATE users set status="+db.escape(status_dis)+" WHERE username="+db.escape(email);
            con.query(sql_user_en,function(err,fields_en){
                if(err){
                    console.log(err);
                }
                else{
            res.redirect('/superadmin/dashboard');
                }
        })
}
    })
}
else{
    var status_en='Enable'
    var status_en_false='Disable';
    var sql_en="UPDATE hotels set Status="+db.escape(status_en)+",status_false="+db.escape(status_en_false)+" where ID="+db.escape(id);
    console.log(sql_en);
    con.query(sql_en,function(err,fields){
        if(err){
            console.log(err);
        }
        else{
            var sql_user_dis="UPADTE users SET status="+db.escape(status_en)+" WHERE username="+db.escape(email);
            res.redirect('/superadmin/dashboard');
        }
    })
}
        }
});
});

app.post('/superadmin/edit',function(req,res){
    var id=req.body.id;
    var sql="SELECT*FROM hotels where ID="+db.escape(id);
    con.query(sql,function(err,fields){
        if(err){
            console.log(err);
        }
        else{
           // var id=fields[0].id;
            var hotel=fields[0].Name;
            var address=fields[0].Address;
            var contact=fields[0].Contact;
            var admin=fields[0].admin;
            var fields=fields[0].Email;
            console.log(id);
            res.render('hoteledit2',{
                id:id,
               hotel:hotel,
               address:address,
               contact:contact,
               admin:admin,
               email:email
            })
        }
    })
});

//===++ Enable/Disable Flight Option ++===
app.post('/admin/add_flight',function(req,res){
    var screen_id=req.body.screen_id;
    console.log('Screen Id : '+screen_id);
    var sql_screen="SELECT*FROM screens WHERE ID="+db.escape(screen_id);
    console.log(sql_screen);
    con.query(sql_screen,function(err,fields_screen){
                var flight=fields_screen[0].SHOW_FLIGHT_TIME;
        console.log('Show Flight:'+flight);
        if(flight=="off"){
            var status_y='on';
            var sql_yes="UPDATE screens set SHOW_FLIGHT_TIME="+db.escape(status_y)+" WHERE ID="+db.escape(screen_id);
            con.query(sql_yes,function(err,fields_flight){
                if(err){
                    console.log(err);
                }
                else{
                    res.redirect('/admin/dashboard');
                }
            })
        }
        else{
            var status_n='off';
            var sql_n="UPDATE screens set SHOW_FLIGHT_TIME="+db.escape(status_n)+" WHERE ID="+db.escape(screen_id);
            con.query(sql_n,function(err,fields_flight){
                if(err){
                    console.log(err);
                }
                else{
                    res.redirect('/admin/dashboard');
                }
            })
        }
    })
});

//===++ Enable/Disable Weather Option ++===
app.post('/admin/add_weather',function(req,res){
    var screen_id=req.body.screen_id;
    console.log('Screen Id : '+screen_id);
    var sql_screen="SELECT*FROM screens WHERE ID="+db.escape(screen_id);
    console.log(sql_screen);
    con.query(sql_screen,function(err,fields_screen){
        var flight=fields_screen[0].Weather_Display;
        console.log(flight);
        if(flight=="off"){
            var status_y='on';
            var sql_yes="UPDATE screens set Weather_Display="+db.escape(status_y)+" WHERE ID="+db.escape(screen_id);
            con.query(sql_yes,function(err,fields_flight){
                if(err){
                    console.log(err);
                }
                else{
                    res.redirect('/admin/dashboard');
                }
            })
        }
        else{
            var status_n='off';
            var sql_n="UPDATE screens set Weather_Display="+db.escape(status_n)+" WHERE ID="+db.escape(screen_id);
            con.query(sql_n,function(err,fields_flight){
                if(err){
                    console.log(err);
                }
                else{
                    res.redirect('/admin/dashboard');
                }
            })
        }
    })
})

// ====++Enable/Disable Events Option++=====
app.post('/admin/add_events',function(req,res){
    var screen_id=req.body.screen_id;
    console.log('Screen Id : '+screen_id);
    var sql_screen="SELECT*FROM screens WHERE ID="+db.escape(screen_id);
    console.log(sql_screen);
    con.query(sql_screen,function(err,fields_screen){
        var events=fields_screen[0].show_event;
        console.log(events);
        if(events=="off"){
            var status_y='on';
            var sql_yes="UPDATE screens set show_event="+db.escape(status_y)+" WHERE ID="+db.escape(screen_id);
            con.query(sql_yes,function(err,fields_flight){
                if(err){
                    console.log(err);
                }
                else{
                    res.redirect('/admin/dashboard');
                }
            })
        }
        else{
            var status_n='off';
            var sql_n="UPDATE screens set show_event="+db.escape(status_n)+" WHERE ID="+db.escape(screen_id);
            con.query(sql_n,function(err,fields_flight){
                if(err){
                    console.log(err);
                }
                else{
                    res.redirect('/admin/dashboard');
                }
            })
        }
    })
})

//====++Add Screen++=====
app.post('/admin/add_screen',function(req,res){
    var screen_id=req.body.screen_id;
    var weather=req.body.weather;
    var flight=req.body.flight;
    var event=req.body.event;
    values=[[
        screen_id,weather,flight,req.session.hotel_id,event
    ]];
    var sql_add_screen="INSERT INTO screens(Screen_ID,Weather_Display,SHOW_FLIGHT_TIME,Hotel_ID,show_event) VALUES(?)";
    con.query(sql_add_screen,values,function(err,fields_ret){
        if(err){
            console.log(err);
        }
        else{
            var sql_admin="SELECT*FROM users WHERE name="+db.escape(req.session.admin);
            con.query(sql_admin,function(err,fields_admin){
                if(err){
                    console.log(err);
                }
                else{
            res.redirect('/admin/dashboard');
            var email=fields_admin[0].username;
             var mailOptions = {
  from: 'tanumayld@gmail.com',
  to: email+',tanumay@sugoilabs.com',
  subject: 'Screen Added',
  html: 'Your Hotel  added a new Screen.<br/> Your Screen Link is given in this mail. Please find the Link Below.<br/><b> Link of The Screen:<u>localhost:3000/page?id='+screen_id
};

transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
    });
                }
    })
        }
    })
})

//====++Ad photos++=====
app.post('/admin/addphoto',function(req,res){
   req.session.screen_id=req.body.screen_id;
   res.render('photos');
});

//====++Upload Photos++===
app.post('/admin/upload',function(req,res){
  if(req.files){
        
       var show=req.files;
       var file=req.files.photo,
       photo=req.session.screen_id+''+file.name;
    console.log('Photo Name : '+photo);
        file.mv('./upload/'+photo,function(err,field){
           if(err){
               console.log(err);
           }
           else{
             values=[[
                 photo,req.session.screen_id,req.session.hotel_id
             ]];
             var sql_photos="INSERT INTO photos(name,screens_id,hotel_id)VALUES(?)";
             con.query(sql_photos,values,function(err,fields){
                 if(err){
                     console.log(err);
                 }
                 else{
                     res.redirect('/admin/dashboard');
                 }
             })
           }
        })
  }
})

//====++Delete Screen++====
app.post('/admin/screen_del',function(req,res){
    var screen_id=req.body.screen_id;
    var sql_screen_del="Delete from screens where ID="+db.escape(screen_id);
    con.query(sql_screen_del,function(err,fields){
        if(err){
            console.log(err);
        }
        else{
            var sql_photo_del="DELETE FROM photos WHERE screens_id="+db.escape(screen_id);
            console.log('Delete Sql:'+sql_photo_del);
            con.query(sql_photo_del,function(err,fields_photo){
             if(err){
                 console.log(err);
             }    
             else{
                 res.redirect('/admin/dashboard');
             }
            })
        }
    })
})

// ====+++Add Screens Get+++====
app.get('/admin/addscreen',function(req,res){
    var no_screens;
    var sql_screen="SELECT*FROM screens where Hotel_ID="+db.escape(req.session.hotel_id);
    console.log(sql_screen);
    con.query(sql_screen,function(err,fields_screen){
        no_screens=fields_screen.length;
        if(err){
            console.log(err);
        }
    })
    var sql_hotels="Select*from hotels where ID="+db.escape(req.session.hotel_id);
    console.log(sql_hotels);
    con.query(sql_hotels,function(err,fields_hotels){
        console.log(fields_hotels[0].NO_of_Screens);
                if(err){
            console.log(err);
        }
        else{
            var screens=fields_hotels[0].NO_of_Screens;
            var screen_no=parseInt(screens,10);
            console.log(screen_no+':'+no_screens);
            if(no_screens<screen_no){
                var sql_rooms="SELECT*FROM rooms WHERE Hotel_ID="+db.escape(req.session.hotel_id);
                con.query(sql_rooms,function(err,fields_room){
                    if(err){
                        console.log(err);
                    }
                    else{
                res.render('add_screen',{
                       fields:fields_room,  
                });
                    }
                })
            }
            else{
                res.render('max_screen');
            }
        }
    })
});

//====++Room Details++====
app.get('/admin/rooms',function(req,res){
    if(!req.session.admin){
        res.redirect('/login');
    }
    else{
        var sql_rooms="SELECT*FROM rooms WHERE Hotel_ID="+db.escape(req.session.hotel_id);
        con.query(sql_rooms,function(err,fields_room){
            if(err){
                console.log(err);
            }
            else{
                console.log(req.session.admin);
                res.render('rooms',{
                    fields:fields_room,
                    user:req.session.admin
                });
            }
        })
    }
});

//====++Admin Edit Room++====
app.post('/admin/edit_room',function(req,res){
    var room_id=req.body.room_id;
    var sql_room_edit="SELECT*FROM rooms WHERE ID="+db.escape(room_id);
    con.query(sql_room_edit,function(err,fields_room){
        if(err){
            console.log(err);
        }
        else{
            var room_name=fields_room[0].room_name;
            var floor=fields_room[0].floor;
            var room_id=fields_room[0].ID;
            res.render('room_edit',{
                room_name:room_name,
                floor:floor,
                room_id:room_id
            })
        }
    })
})

//====++Update Room++====
app.post('/admin/update_room',function(req,res){
  var room_name=req.body.room_name;
  var floor=req.body.floor;
  var room_id=req.body.room_id;
  console.log('Room_ID:'+room_id)
  var sql_room_update="UPDATE rooms set room_name="+db.escape(room_name)+",floor="+db.escape(floor)+" WHERE ID="+db.escape(room_id);
  console.log(sql_room_update);
  con.query(sql_room_update,function(err,fields_rooms){
      if(err){
          console.log(err);
      }
      else{
          res.redirect('/admin/rooms');
      }
  })
})

//===++Delete Rooms++====
app.post('/admin/room_delete',function(req,res){
    var room_id=req.body.room_id;
    var sql_room_delete="Delete from rooms WHERE ID="+db.escape(room_id);
    console.log(sql_room_delete);
    con.query(sql_room_delete,function(err,fields_rooms){
        if(err){
            console.log(err);
        }
        else{
            res.redirect('/admin/rooms');
        }
    })
})

//===++Add Rooms++====
app.get('/admin/addroom',function(req,res){
    if(!req.session.admin){
        res.redirect('/login');
    }
    else{
        var sql_rooms="SELECT*FROM "
        res.render('add_room');
    }
})

//===++Add Room Post++===
app.post('/admin/addroom',function(req,res){
    var room_name=req.body.room_name;
    var floor=req.body.floor;
    values=[[
        req.session.hotel_id,room_name,floor
    ]];

    var sql_add_room="INSERT INTO rooms(Hotel_ID,room_name,floor) VALUES(?)";
    con.query(sql_add_room,values,function(err,fields_room){
        if(err){
            console.log(err);
        }
        else{
            res.redirect('/admin/rooms');
        }
    })
});

//====++Admin Events++====
app.get('/admin/events',function(req,res){
    if(!req.session.admin){
        res.redirect('/login');
    }
    else{
        var sql_events="SELECT*FROM events WHERE hotel_id="+db.escape(req.session.hotel_id);
        console.log(sql_events);
        con.query(sql_events,function(err,fields_events){
        if(err){
            console.log(err);
        }
        else{
        var base='http://localhost:3000/airlines_feed';
        res.render('events',{
            fields:fields_events,
            base:base
        });
        }
})    
}
});

//====++Edit Events++====
app.post('/admin/edit_event',function(req,res){
    var event_id=req.body.event_id;
    var sql_event_edit="SELECT*FROM events where ID="+db.escape(event_id);
    console.log(sql_event_edit);
    con.query(sql_event_edit,function(err,fields_event){
        if(err){
            console.log(err);
        }
        else{
             var sql_event="SELECT*from rooms WHERE Hotel_ID="+db.escape(req.session.hotel_id);
             con.query(sql_event,function(err,fields_room){
                 if(err){
                     console.log(err);
                 }
                 else{
            res.render('event_edit',{
                fields:fields_event,
                field_room:fields_room
            })
                 }
            })
        }
    })
})

//====++Update Event++=====
app.post('/admin/updateevent',function(req,res){
    var event_id=req.body.event_id;
    var event_name=req.body.event_name;
    var room=req.body.room;
    var date=req.body.date;
    var start_time=req.body.start_time;
    var end_time=req.body.end_time;
    
    var sql_event_update="UPDATE events set event_name="+db.escape(event_name)+",room_id="+db.escape(room)+",date="+db.escape(date)+",start_time="+db.escape(start_time)+",end_time="+db.escape(end_time)+" WHERE ID="+db.escape(event_id);
    console.log(sql_event_update);
    con.query(sql_event_update,function(err,fields_events){
        if(err){
            console.log(err);
        }
        else{
            res.redirect('/admin/events')
        }
    })

});

//====++Delete Events++====
app.post('/admin/delete_event',function(req,res){
    var event_id=req.body.event_id;

    var sql_event_delete="Delete from events where ID="+db.escape(event_id);
    con.query(sql_event_delete,function(err,fileds_event){
        if(err){
            console.log(err);
        }
        else{
            res.redirect('/admin/events');
        }
    })
});

//====++Add Events++====
app.get('/admin/addevent',function(req,res){
    if(!req.session.admin){
        res.redirect('/login');
    }
    else{
        var sql_event="SELECT*from rooms WHERE Hotel_ID="+db.escape(req.session.hotel_id);
        console.log(sql_event);
        con.query(sql_event,function(err,fields_room){
            console.log(fields_room[0].room_name);
            if(err){
                console.log(err);
            }
            else{
                var base=req.baseUrl;
                console.log('Url:'+base);
                res.render('add_event',{
                    fields:fields_room
                })
            }
        })
    }
});

//====++Add Events++====
app.post('/admin/addevent',function(req,res){
    var event_name=req.body.event_name;
    var room=req.body.room;
    var date=req.body.date;
    var start_time=req.body.start_time;
    var end_time=req.body.end_time;

    values=[[
        event_name,date,room,req.session.hotel_id,start_time,end_time
    ]];
    var sql_add_event="INSERT INTO events(event_name,date,room_id,hotel_id,start_time,end_time) VALUES(?)";
    con.query(sql_add_event,values,function(err,fields_events){
        if(err){
            console.log(err);
        }
        else{
            res.redirect('/admin/events');
        }
    })
})

//====++ Super Admin Log out ++====
app.get('/superadmin/logout',function(req,res){
     req.session.destroy();
    res.redirect('/login');
})

//===++Admin Log out++====
app.get('/admin/logout',function(req,res){
    req.session.destroy();
    res.redirect('/login');
})

//====++Screen View++=====
app.get('/page',function(req,res){
    var url=req.get('Host')+''+req.originalUrl;
    console.log('Original URL :'+
    url);
    var index=url.indexOf('=');
    var ln=url.length;
    var screen_id=url.substring(index+1,ln);
    console.log('After Split:'+screen_id);
    var screen=screen_id;
    var sql="SELECT*FROM photos WHERE screens_id="+db.escape(screen);
    con.query(sql,function(err,fields_photo){
        var return_row=fields_photo.length;
        if(err){
            console.log(err);
        }
       
        else if(return_row>0){
            var hotel_id=fields_photo[0].hotel_id;
            var sql_events="select*from events where hotel_id="+db.escape(hotel_id);
            con.query(sql_events,function(err,fields_event){
                if(err){
                    console.log(err);
                }
                else{
                    res.render('screenview',{
                        photos:fields_photo,
                        events:fields_event
                    });
                   /* var day=new Date().getDay;
                    var mon=new Date().getMonth;
                    var year=new Date().getFullYear;
                    console.log(day+'-'+mon+'-'+year);*/
                    qpx.api("1", "EUR5000", "1", "YYC","SFO", "2018-12-14", function(data){
    //data looks like: [ { Destination: , Origin: , airline: 'Name of airline', arrivalTime: 'Arrival Time', departureTime: 'Departure Time', flightNumber: 'Flight Number', price: 'EUR71.10' } ] 
    //for connecting flights it is an array of two flight object. 
    console.log(data);
    console.log(data[0].airline);
});
qpx.api("1", "EUR5000", "1", "YYC","LAX", "2018-12-14", function(data){
    //data looks like: [ { Destination: , Origin: , airline: 'Name of airline', arrivalTime: 'Arrival Time', departureTime: 'Departure Time', flightNumber: 'Flight Number', price: 'EUR71.10' } ] 
    //for connecting flights it is an array of two flight object. 
    console.log(data);
    console.log(data[0].airline);
});
                }
            });
        }
            });
});

//=====++Listening to Port++=======
app.listen(3000,function(req,res){
    console.log('Server running on http://127.0.0.1.3000');
});