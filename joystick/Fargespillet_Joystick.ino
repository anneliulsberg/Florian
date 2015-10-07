// http://www.arduino.cc/en/Tutorial/Pushbutton

int redLed = 3;
int greenLed = 6;
int blueLed = 11;

int redPin = 4;
int greenPin = 7;
int bluePin = 2;

int redButton = 0;
int greenButton = 0;
int blueButton = 0;

void setup() {
  pinMode(redPin, INPUT);
  pinMode(redLed, OUTPUT);
  
  pinMode(greenPin, INPUT);
  pinMode(greenLed, OUTPUT);

  pinMode(bluePin, INPUT);
  pinMode(blueLed, OUTPUT);
  
  Serial.begin(9600);  
}

void loop() {
  redButton = digitalRead(redPin);
  greenButton = digitalRead(greenPin);
  blueButton = digitalRead(bluePin);
  
  if (redButton == 1) {
    analogWrite(redLed, 255);
  } else {
    analogWrite(redLed, 0);
  }
  
  if (greenButton == 1) {
    analogWrite(greenLed, 255);
  } else {
    analogWrite(greenLed, 20);
  }
  
  if (blueButton == 1) {
    analogWrite(blueLed, 255);
  } else {
    analogWrite(blueLed, 20);
  }
  
  String buttons = String(redButton) + String(greenButton) + String(blueButton);
  Serial.println(buttons);
}
