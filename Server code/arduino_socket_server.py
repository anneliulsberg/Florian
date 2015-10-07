#!/usr/bin/python
# -*- coding: utf-8 -*-

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
#
# Name			:	Arduino <-> WebSocket Server
#
# Description   :   This server allows you to simply connect to your arduino via html5 webSockets.
#					The program will run a Tornado webSocket server on your computer and connect to
#					your arduino via the PySerial library.
#
# Author		:	Olivier Klaver
#
# Version		:	0.9 (06/02/2012)
#
# License		:	GNU Lesser General Public License 3 (LGPL3)
#			
# Dependancies  : 	Tornado  - http://www.tornadoweb.org/
#					PySerial - http://pyserial.sourceforge.net/examples.html
#
# Installation	:	- Install python 2.7.x.
#					- Install Tornado 2.2.
#					- Install PySerial.
#					- Set the ARDUINO_PORT variable in this script to match the serial
#					  port your arduino is connected to.
#					- Run this program in your terminal. 
#						1. locate the files source folder (cd, ls)
#						2. type: python arduino_socket_server.py
#
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

import tornado.websocket
import tornado.httpserver

import threading
import serial
import socket
import time



ARDUINO_PORT = "/dev/tty.usbmodem26411"  # Check Arduino.app > bottom right corner (e.g. Arduino Uno on /dev/tty.usbmodemfd131)
BAUD_RATE    = 9600
SERVER_PORT  = 8888

RESET_DELAY  = 10

arduino    = None
clientList = []



def main():
	
	print '\n--- Arduino <-> WebSocket Server ---\n'
	
	# connect to the arduino on the serial port
	initSerial()
	
	# setup the tornado webSocket server
	initServer()
	
	

def initSerial():
	
	print "Connecting to your arduino on serial port: %s" % ARDUINO_PORT
	try:
		global arduino
		arduino = serial.Serial(ARDUINO_PORT, BAUD_RATE)
		if arduino.isOpen() == False:
			arduino.open()
		ArduinoListner().start()
	except:
		print 'Error: Can not connect to your Arduino.'
		print "       Is the serial port: '%s' correct? Trying again in %s seconds..." % (ARDUINO_PORT, RESET_DELAY,)
		time.sleep(RESET_DELAY)
		initSerial()
		


def initServer():
	
	urlResolver = tornado.web.Application([
		(r"/websocket", EchoWebSocket),
		(r"/crossdomain\.xml", CrossDomainPolicyHandler),
		(r"/.*", MainHandler),
	])
	
	try:
		http_server = tornado.httpserver.HTTPServer(urlResolver)
		http_server.listen(SERVER_PORT)
		print "Starting server at: %s:%s" % (socket.gethostbyname(socket.gethostname()), SERVER_PORT,)
		print '\nServer log:'
		tornado.ioloop.IOLoop.instance().start()
	except:
		print 'Error: Server can not start.'
		print "       Make sure that the server is not already running. Trying again in %s seconds..." % RESET_DELAY
		time.sleep(RESET_DELAY)
		initServer()



class EchoWebSocket(tornado.websocket.WebSocketHandler):
      
      def allow_draft76(self):
          # use older websocket handshake implementation for iOS devices
          return True
      
      
      def open(self):
          global clientList 
          clientList.append(self)
          if len(clientList) == 1:
          	print "WebSocket opened (1 client connected)"
          else:
          	print "WebSocket opened (%s clients connected)" % len(clientList)
          	
      
      def on_message(self, message):
          print u"Message from Client to Arduino: '%s'" % message
          if arduino != None:
          	arduino.write(message + u'\n')
          
      
      def on_close(self):
      	global clientList
      	clientList.remove(self)
      	if len(clientList) == 1:
      		print "WebSocket closed (1 client left)"
      	else:
      		print "WebSocket closed (%s clients left)" % len(clientList)
            


class CrossDomainPolicyHandler(tornado.web.RequestHandler):
    
    def get(self):
    	self.set_header("Content-Type", "text/xml") 
    	self.write(u'<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE cross-domain-policy SYSTEM "http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd">\n<cross-domain-policy>\n<allow-access-from domain="*" to-ports="*"/>\n</cross-domain-policy>')
        
        

class ArduinoListner(threading.Thread):
	
	def run(self):
		while 1:
			message =  arduino.readline().strip()
			arduino.flush()
			try:
				print u"Message from Arduino to all Clients: '%s'" % message
			except:
				print u"Invalid message from Arduino. Can't send to Clients."
			
			for client in clientList:
				try:
					client.write_message(message.encode('utf-8'))
				except:
					print u"Couldn't write to client."
			


class MainHandler(tornado.web.RequestHandler):
    
    def get(self):
        self.write("404 - Remember, this is only a webSocket server!")
        
        

if __name__ == "__main__":
	main()
	
	
