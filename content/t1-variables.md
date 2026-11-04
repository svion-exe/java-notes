# Variables, Data Types and Casting
id: t1
summary: How Java stores values in typed variables, what the eight primitives hold, how scope, shadowing, conversions, precision and operators behave, and where each of them surprises beginners.

## Primitive and reference types {#t1-prim-ref}

A variable is a named slot that holds one value of one declared type. Java has two kinds of types. A **primitive** variable holds the value itself. A **reference** variable holds the address of an object that lives on the heap. Almost every beginner bug about copying, comparing and passing data comes from mixing these two up.

:::code nocheck
int marks = 90;          // the slot holds 90
String name = "Ana";     // the slot holds a reference to a String object
:::

Copying a primitive copies the value. The two variables are then independent.

:::code
int a = 5;
int b = a;
b = 7;
System.out.println("a=" + a + " b=" + b);
:::
:::out
a=5 b=7
:::

Copying a reference copies the address. Both variables now reach the same object.

:::code
int[] scores = {10, 20};
int[] copy = scores;
copy[0] = 99;
System.out.println(scores[0]);
:::
:::out
99
:::

:::mem One array, two references
stack
  frame main
  scores -> #1
  *copy -> #1
heap
  *#1 int[] : 99 | 20
caption: copy = scores copied the address, not the array. Writing through copy changes what scores sees.
:::

A primitive variable always has a value. A reference variable may hold **null**, which means "no object". Calling a method through null fails at run time.

:::code
String city = null;
System.out.println(city);
System.out.println(city.length());
:::
:::out
null
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.length()" because "<local1>" is null
:::

:::mem Primitive in the slot, reference points away
stack
  frame main
  marks = 90
  name -> #1
  city -> null
pool
  #1 String : "Ana"
caption: marks holds 90 directly. name holds an arrow to a String. city holds nothing, so there is nothing to call methods on.
:::

### How to tell them apart

- The eight primitive type names are lowercase keywords: `byte short int long float double char boolean`.
- Everything else is a reference type: `String`, arrays, `Scanner`, your own classes. `String` starts with a capital letter and is not a primitive.
- A reference type can be assigned `null`. A primitive cannot.

:::code fail
int count = null;
:::
:::out
incompatible types: <null> cannot be converted to int
:::

:::note
`==` on primitives compares values. `==` on references compares addresses, that is, "is it the very same object". Comparing String contents is covered in [[t5-equality|String equality]]. Each primitive also has an object wrapper, such as `Integer` for `int`, covered in [[t7-wrappers|wrapper classes]].
:::

:::q
Q: What does this print?
```java
int[] a = {1, 2, 3};
int[] b = a;
b[2] = 30;
int x = a[0];
int y = x;
y = 100;
System.out.println(a[2] + " " + x);
```
A: It prints `30 1`.
```out
30 1
```
E: `b` and `a` are one array, so the write through `b` shows through `a`. `y = x` copied a primitive, so changing `y` never touches `x`.
:::

:::q
Q: True or false: `String s = null;` is legal, and so is `int n = null;`.
A: False. The first is legal and the second is a compile error.
E: Only reference types can hold null. A primitive slot always holds a real value of its type.
:::

## The eight primitives {#t1-primitives}

Java has exactly eight primitive types. Each has a fixed size in bits, so a value is the same size on every machine. That fixed size is why `int` always means 32 bits in Java, unlike C.

| Type | Bits | Range | Default (field) |
|---|---|---|---|
| byte | 8 | -128 to 127 | 0 |
| short | 16 | -32768 to 32767 | 0 |
| int | 32 | about -2.1 billion to 2.1 billion | 0 |
| long | 64 | about -9.2e18 to 9.2e18 | 0L |
| float | 32 | about 3.4e38, 7 digits | 0.0f |
| double | 64 | about 1.8e308, 15-16 digits | 0.0 |
| char | 16 | 0 to 65535 (unsigned) | '\u0000' |
| boolean | JVM decides | true or false | false |

The integer types are **signed** two's complement: one bit is the sign, so the range is not symmetric. There is one more negative value than positive. `char` is the only unsigned one.

:::code
System.out.println(Byte.MIN_VALUE + " " + Byte.MAX_VALUE);
System.out.println(Short.MIN_VALUE + " " + Short.MAX_VALUE);
System.out.println(Integer.MIN_VALUE + " " + Integer.MAX_VALUE);
System.out.println(Long.MIN_VALUE);
System.out.println(Long.MAX_VALUE);
System.out.println((int) Character.MAX_VALUE);
:::
:::out
-128 127
-32768 32767
-2147483648 2147483647
-9223372036854775808
9223372036854775807
65535
:::

`float` and `double` have a maximum, but their `MIN_VALUE` is the smallest **positive** value, not the most negative one.

:::code
System.out.println(Float.MAX_VALUE);
System.out.println(Double.MAX_VALUE);
System.out.println(Float.MIN_VALUE);
System.out.println(-Double.MAX_VALUE);
:::
:::out
3.4028235E38
1.7976931348623157E308
1.4E-45
-1.7976931348623157E308
:::

:::svg Value ranges at a glance (bit widths)
<svg viewBox="0 0 360 170">
  <rect class="dg-box" x="10" y="14" width="30" height="22" rx="4"/>
  <text class="dg-text" x="48" y="30">byte  8 bits</text>
  <rect class="dg-box" x="10" y="44" width="60" height="22" rx="4"/>
  <text class="dg-text" x="78" y="60">short  16 bits</text>
  <rect class="dg-hl" x="10" y="74" width="120" height="22" rx="4"/>
  <text class="dg-text" x="138" y="90">int  32 bits</text>
  <rect class="dg-box" x="10" y="104" width="240" height="22" rx="4"/>
  <text class="dg-text" x="258" y="120">long</text>
  <text class="dg-label" x="258" y="136">64 bits</text>
  <rect class="dg-warn" x="10" y="144" width="60" height="18" rx="4"/>
  <text class="dg-text" x="78" y="157">char  16 bits, no sign</text>
</svg>
:::

### Fields have defaults, locals do not

A **field** (a variable declared in a class, outside any method) gets a default value from the JVM. A **local variable** (declared inside a method) gets nothing. The compiler refuses to let you read it before you assign it.

:::code
class Defaults {
    static byte b;
    static int i;
    static long l;
    static double d;
    static char c;
    static boolean flag;
    static String text;

    public static void main(String[] args) {
        System.out.println(b + " " + i + " " + l + " " + d);
        System.out.println((int) c + " " + flag + " " + text);
    }
}
:::
:::out
0 0 0 0.0
0 false null
:::

:::code fail
int count;
System.out.println(count);
:::
:::out
variable count might not have been initialized
:::

### char is a number

A `char` holds a 16-bit code (a UTF-16 code unit), so it takes part in arithmetic. `'A'` is 65, `'a'` is 97, `'0'` is 48. The type decides what `println` shows, not the stored bits.

:::code
char letter = 'A';
System.out.println(letter);
System.out.println(letter + 1);
System.out.println((char) (letter + 1));
letter++;
System.out.println(letter);
System.out.println('A' + 'B');
System.out.println("" + 'A' + 1);
:::
:::out
A
66
B
B
131
A1
:::

`boolean` is not a number. Java does not convert between `boolean` and `int` at all, so C-style `if (1)` does not exist.

:::code fail
int flag = true;
:::
:::out
incompatible types: boolean cannot be converted to int
:::

### Why int is the default

An integer literal such as `42` has type `int`. Arithmetic on `byte`, `short` and `char` also produces `int` (see [[t1-promotion|promotion]]). `int` is 32 bits, which matches the natural word size of the hardware and covers counts, indexes and array sizes. Use `long` when a value can pass about 2 billion (milliseconds, file sizes, factorials). Use `double` for fractions. `byte`, `short` and `float` are for saving memory in large arrays, and are rare in ordinary code.

:::interview
Q: How many primitive types are there and is String one of them?
A: Eight: byte, short, int, long, float, double, char, boolean. String is a class, so it is a reference type.
:::

:::q
Q: What does this print?
```java
class Slots {
    static int total;
    static boolean done;
    static double rate;
    public static void main(String[] args) {
        System.out.println(total + " " + done + " " + rate);
    }
}
```
A: `0 false 0.0`
```out
0 false 0.0
```
E: Fields get default values. The same three variables declared inside `main` would not compile when read before assignment.
:::

:::q
Q: What does `System.out.println('a' + 1);` print?
```java
System.out.println('a' + 1);
System.out.println((char) ('a' + 1));
```
A: `98` then `b`.
```out
98
b
```
E: `'a' + 1` is int arithmetic (97 + 1). Only the cast turns the number back into a character. The wrong belief is that adding to a char stays a char.
:::

:::q
Q: Why does `Byte.MAX_VALUE` equal 127 and not 128?
A: Because one of the 256 patterns is used for 0.
E: 8 bits give 256 patterns. A signed type splits them into 128 negatives (-128 to -1), zero, and 127 positives.
:::

## Literals {#t1-literals}

A **literal** is a value written directly in the source. Its form decides its type. Getting the type of the literal right matters, because the compiler checks it before it checks what you are assigning to.

| Literal | Type | Notes |
|---|---|---|
| `42` | int | decimal |
| `42L` | long | suffix `L`, prefer capital |
| `3.14` | double | any decimal point makes it double |
| `3.14f` | float | suffix `f` |
| `2d`, `1e3` | double | exponent form is double too |
| `'A'` | char | single quotes |
| `"A"` | String | double quotes |
| `true`, `false` | boolean | |

### Number bases and underscores

:::code
int million = 1_000_000;
int hex = 0xFF;
int bin = 0b1010;
int oct = 017;
long big = 3_000_000_000L;
double sci = 1.5e3;
System.out.println(million + " " + hex + " " + bin + " " + oct);
System.out.println(big + " " + sci);
:::
:::out
1000000 255 10 15
3000000000 1500.0
:::

- Underscores only help the eye. They are allowed between digits, not at the start or end.
- `0x` is hexadecimal, `0b` is binary, and a **leading zero** means octal.

:::trap
`int room = 010;` is 8, not 10. A leading zero makes an octal literal. Never pad numbers with zeros in source code.
:::

### The suffix L and the suffix f

A literal without a suffix is `int` (or `double` if it has a decimal point). The compiler checks the literal first, and only then the target.

:::code fail
long population = 3000000000;
:::
:::out
integer number too large
:::

The literal `3000000000` is an `int` literal, and it does not fit in an `int`. The target being `long` does not help. Write `3000000000L`.

:::code fail
float price = 3.14;
:::
:::out
incompatible types: possible lossy conversion from double to float
:::

`3.14` is a `double`. Putting a 64-bit value into a 32-bit slot can lose information, so the compiler demands that you say so: write `3.14f` or `(float) 3.14`.

:::code
float price = 3.14f;
double rate = 3.14;
long seconds = 86_400L * 365;
System.out.println(price + " " + rate + " " + seconds);
:::
:::out
3.14 3.14 31536000
:::

### char and string escapes

A `char` literal uses single quotes. It may be a letter, a number code, or a Unicode escape `\uXXXX` (four hex digits).

:::code
char a = 'A';
char b = 65;
char c = '\u0041';
System.out.println("" + a + b + c);
System.out.println("She said \"hi\"");
System.out.println("path C:\\temp");
System.out.println("it's " + '\'');
System.out.println("line1\nline2");
:::
:::out
AAA
She said "hi"
path C:\temp
it's '
line1
line2
:::

| Escape | Meaning |
|---|---|
| `\n` | new line |
| `\t` | tab |
| `\\` | one backslash |
| `\"` | double quote (needed inside a String) |
| `\'` | single quote (needed inside a char) |
| `\uXXXX` | Unicode code unit |

`char b = 65;` works because `65` is a constant that fits in a `char`. That rule is explained in [[t1-promotion|promotion]].

:::q
Q: What is the value printed?
```java
System.out.println(0x1F + 0b11 + 010);
```
A: `42`
```out
42
```
E: 0x1F is 31, 0b11 is 3 and 010 is octal 8. The leading zero is the part people skim past: 31 + 3 + 8 = 42.
:::

:::q
Q: Why does `long ms = 24 * 60 * 60 * 1000 * 365;` look fine but give a wrong value?
A: The multiplication is done in `int` and overflows before the result is widened to `long`.
E: Every literal is an `int`, so the whole product is `int` arithmetic. Write one operand as `24L` to force `long` math from the start. Details in [[t1-promotion|promotion]].
:::

:::q
Q: Does this compile?
```java
float f = 2.5;
```
A: No.
```err
possible lossy conversion from double to float
```
E: `2.5` is a double literal. It needs an `f` suffix or a cast.
:::

## Scope and lifetime {#t1-scope}

The **scope** of a variable is the part of the source where its name can be used. A local variable exists from its declaration to the closing brace of the block that holds it. After that brace the name is gone and the compiler reports `cannot find symbol`. Scope keeps names short and stops one part of a program from touching data that belongs to another part.

:::code
int total = 10;
{
    int inner = total + 5;
    System.out.println(inner);
}
System.out.println(total);
:::
:::out
15
10
:::

An inner block can see the variables of every block around it. An outer block cannot see into an inner one.

:::svg Scopes are nested boxes
<svg viewBox="0 0 360 150">
  <rect class="dg-box" x="10" y="10" width="340" height="130" rx="8"/>
  <text class="dg-label" x="22" y="28">method body: total</text>
  <rect class="dg-hl" x="40" y="42" width="290" height="86" rx="8"/>
  <text class="dg-label" x="52" y="60">block or loop body: inner</text>
  <rect class="dg-warn" x="70" y="72" width="230" height="46" rx="8"/>
  <text class="dg-text" x="82" y="100">deepest block: sees all three</text>
</svg>
:::

:::code fail
int total = 10;
{
    int inner = total + 5;
}
System.out.println(inner);
:::
:::out
cannot find symbol
:::

### Loop variables

A variable declared in the header of a `for` loop belongs to the loop only. A variable declared inside the body is created fresh on every pass and destroyed at the end of that pass.

:::code
int sum = 0;
for (int i = 1; i <= 3; i++) {
    int sq = i * i;
    sum += sq;
}
System.out.println(sum);
:::
:::out
14
:::

:::dry Lifetime of i and sq
1 | sum=0 | sum lives in the whole method
2 | i=1 | i is created by the loop header
3 | sq=1 | sq is created inside the body
4 | sum=1 | 0 + 1
2 | i=2 | next pass, the old sq is gone
3 | sq=4 | a new sq is created
4 | sum=5 | 1 + 4
2 | i=3 | third pass
3 | sq=9 | 3 * 3
4 | sum=14 | 5 + 9
2 | i=4;~sq | 4 <= 3 is false, the body ends and sq is gone
6 | ~i | the loop is over, so i is gone too | 14
:::

:::code fail
for (int i = 0; i < 3; i++) {
    System.out.println(i);
}
System.out.println(i);
:::
:::out
cannot find symbol
:::

To use the counter after the loop, declare it before the loop.

:::code
int i;
for (i = 0; i < 5; i++) {
    if (i * i > 10) break;
}
System.out.println("stopped at " + i);
:::
:::out
stopped at 4
:::

### Locals, parameters and fields

- A **local variable** lives until its block ends. It sits in the stack frame of the method call, as drawn in [[t1-prim-ref|primitive and reference types]].
- A **parameter** is a local variable that the caller fills in. It lives for the whole method.
- A **field** belongs to the class (or to an object). It lives as long as the class or the object lives, and every method of the class can use it.

:::code
class Counter {
    static int count = 0;

    static void hit() {
        int step = 1;
        count += step;
    }

    public static void main(String[] args) {
        hit();
        hit();
        System.out.println(count);
    }
}
:::
:::out
2
:::

`step` is created and destroyed on each call of `hit`. `count` survives between the calls. Methods in detail: [[t2-anatomy|anatomy of a method]].

:::trap
A variable must be assigned on every path before it is read. `int grade; if (marks > 40) grade = 1; System.out.println(grade);` does not compile, because the compiler sees a path where `grade` was never set. Give it a starting value, or assign it in an `else` too.
:::

:::q
Q: Does this compile?
```java
for (int k = 0; k < 2; k++) {
    int copy = k;
}
System.out.println(copy);
```
A: No.
```err
cannot find symbol
```
E: `copy` is declared inside the loop body and ends at its closing brace. The wrong belief is that a variable lives until the end of the method.
:::

:::q
Q: What does this print?
```java
int n = 0;
for (int i = 0; i < 3; i++) {
    int fresh = 0;
    fresh++;
    n += fresh;
}
System.out.println(n);
```
A: `3`
```out
3
```
E: `fresh` is created again as 0 on every pass, so it is 1 at the end of each pass and `n` gains 1 three times. A variable declared outside the loop would keep growing instead.
:::

:::q
Q: True or false: a field needs an initial value before you read it, just like a local variable.
A: False.
E: Fields get a default value (0, false or null). Only locals must be assigned before they are read, as shown in [[t1-primitives|the eight primitives]].
:::

## Shadowing {#t1-shadowing}

**Shadowing** is when a variable hides another variable of the same name from an outer scope. Java allows it in one case only: a local variable or parameter may hide a **field**. It never allows a local to hide another local that is still in scope.

:::code
class Shadow {
    static int level = 1;

    public static void main(String[] args) {
        System.out.println(level);
        int level = 50;
        System.out.println(level);
        System.out.println(Shadow.level);
    }
}
:::
:::out
1
50
1
:::

After `int level = 50;` the simple name `level` means the local. The field is still there and can be reached by its class name, `Shadow.level`. Declaring the same name twice in nested blocks of one method is an error, because the compiler cannot tell which one you mean.

:::code fail
int x = 1;
{
    int x = 2;
}
:::
:::out
variable x is already defined
:::

The same rule applies to a loop variable that reuses the name of a local declared earlier in the method.

:::code fail
int i = 0;
for (int i = 0; i < 3; i++) {
    System.out.println(i);
}
:::
:::out
variable i is already defined
:::

Two blocks that sit side by side are not nested, so each may declare the same name.

:::code
for (int i = 0; i < 2; i++) { System.out.print("a" + i + " "); }
for (int i = 0; i < 2; i++) { System.out.print("b" + i + " "); }
System.out.println();
:::
:::out
a0 a1 b0 b1 
:::

### The constructor and setter bug

The most common real shadowing bug is a parameter with the same name as a field. In `name = name` both sides are the parameter, so the field is never touched. The fix is `this.name`, where `this` means "the current object" (objects are covered later in the course).

:::code
class Student {
    String name = "none";

    void setBad(String name) { name = name; }
    void setGood(String name) { this.name = name; }

    public static void main(String[] args) {
        Student s = new Student();
        s.setBad("Ana");
        System.out.println(s.name);
        s.setGood("Ana");
        System.out.println(s.name);
    }
}
:::
:::out
none
Ana
:::

:::mem Why setBad changes nothing
stack
  frame main
  s -> #1
  frame setBad
  *name -> #2
heap
  #1 Student : name -> #3
pool
  #2 String : "Ana"
  #3 String : "none"
caption: Inside setBad the name `name` is the parameter. The assignment copies the parameter onto itself. The field still points to "none".
:::

:::interview
Q: What is variable shadowing?
A: A local variable or parameter that has the same name as a field hides the field inside its scope. Use `this.field` or `Class.field` to reach the field.
:::

:::q
Q: What does this print?
```java
class Rate {
    static double tax = 0.1;
    public static void main(String[] args) {
        double tax = 0.2;
        tax = tax + Rate.tax;
        System.out.println(tax + " " + Rate.tax);
    }
}
```
A: `0.30000000000000004 0.1`
```out
0.30000000000000004 0.1
```
E: The simple name `tax` is the local (0.2). `Rate.tax` is the field (0.1). The sum is the usual floating point result from [[t1-precision|precision]]. The field is never changed.
:::

:::q
Q: Why does this fail to compile?
```java
int count = 5;
if (count > 2) {
    int count = 7;
}
```
A: `count` is already defined in the method.
```err
variable count is already defined
```
E: A local cannot shadow another local that is still in scope. Choose a new name or reuse the variable with `count = 7;`.
:::

## final, constants and var {#t1-final}

A variable marked **final** can be assigned only once. After that the compiler rejects any change. Use it for values that must not change (a tax rate, a limit) so a later edit cannot break them silently. By convention constants are written in UPPER_SNAKE_CASE.

:::code fail
final int MAX_MARKS = 100;
MAX_MARKS = 90;
:::
:::out
cannot assign a value to final variable MAX_MARKS
:::

A **blank final** is declared without a value and assigned exactly once later, on every path.

:::code
final int bonus;
int marks = 72;
if (marks > 60) {
    bonus = 5;
} else {
    bonus = 0;
}
System.out.println(bonus);
:::
:::out
5
:::

### final fixes the slot, not the object

For a reference, `final` means the variable can never point somewhere else. The object it points to can still change.

:::code
final int[] data = {1, 2, 3};
data[0] = 99;
System.out.println(data[0]);
:::
:::out
99
:::

:::code fail
final int[] data = {1, 2, 3};
data = new int[5];
:::
:::out
cannot assign a value to final variable data
:::

:::mem final reference, changing contents
stack
  frame main
  *data -> #1
heap
  *#1 int[] : 99 | 2 | 3
caption: The arrow from data is locked. The cells inside the array are not. Making a String or wrapper final is different, because those objects cannot change at all, see [[t5-immutability|String immutability]].
:::

### Constants and the compiler

A `final` variable that is initialised with a compile-time constant is itself a **constant expression**. The compiler knows its value and lets it narrow into a smaller type when it fits. This is why `byte b = LIMIT;` works below but the same line fails for a non-final variable (see [[t1-narrowing|narrowing]]).

:::code
final int LIMIT = 100;
byte b = LIMIT;
int other = 100;
System.out.println(b);
:::
:::out
100
:::

:::code fail
int other = 100;
byte b = other;
:::
:::out
possible lossy conversion from int to byte
:::

### var: let the compiler infer the type

Since Java 10 a local variable can be declared with `var`. The compiler reads the initialiser and fixes the type at compile time. `var` is **not** a dynamic type: the variable keeps that one type for its whole life.

:::code
var count = 10;
var big = 10L;
var price = 9.5;
var grade = 'A';
var name = "Ana";
System.out.println(((Object) count).getClass().getSimpleName());
System.out.println(((Object) big).getClass().getSimpleName());
System.out.println(((Object) price).getClass().getSimpleName());
System.out.println(((Object) grade).getClass().getSimpleName());
System.out.println(name.getClass().getSimpleName());
:::
:::out
Integer
Long
Double
Character
String
:::

The class names are the wrapper types that appear when a primitive is boxed into an object, covered in [[t7-wrappers|wrapper classes]]. The point here is that `var` picked `int`, `long`, `double` and `char` from the literals.

:::code fail
var count = 10;
count = 3.5;
:::
:::out
possible lossy conversion from double to int
:::

`var` needs an initialiser that shows the type, and it only works for locals (not fields or parameters).

:::code fail
var x;
:::
:::out
cannot infer type for local variable x
:::

:::note
Use `var` when the type is obvious on the right (`var list = new ArrayList<String>();`). Avoid it when the literal hides the type, such as `var n = 10` where you meant `long`.
:::

:::q
Q: Which line fails to compile?
```java
final int[] marks = {50, 60};
marks[0] = 55;
marks = new int[]{70};
```
A: The third line.
```err
cannot assign a value to final variable marks
```
E: Writing into the array is fine, because `final` locks only the reference. Pointing `marks` at a new array is an assignment to the variable. The wrong belief is that `final` makes the array read-only.
:::

:::q
Q: What does this print?
```java
var a = 7;
var b = 2;
var r = a / b;
System.out.println(r);
```
A: `3`
```out
3
```
E: `var` inferred `int` for both operands, so `/` is integer division and `r` is an `int`. `var` does not turn the result into a double.
:::

:::q
Q: True or false: `final` on a local variable means it must be given its value on the same line.
A: False.
E: A blank final can be assigned later, once, on every path. What is forbidden is a second assignment.
:::

## Widening conversions {#t1-widening}

A **widening conversion** moves a value into a type that can hold every value of the source type. Java does it silently, because nothing is lost in range. The order is a ladder: each type converts to every type to its right.

:::svg Widening ladder
<svg viewBox="0 0 360 150">
  <rect class="dg-box" x="6" y="14" width="46" height="30" rx="6"/>
  <text class="dg-text" x="29" y="33" text-anchor="middle">byte</text>
  <rect class="dg-box" x="64" y="14" width="52" height="30" rx="6"/>
  <text class="dg-text" x="90" y="33" text-anchor="middle">short</text>
  <rect class="dg-hl" x="128" y="14" width="42" height="30" rx="6"/>
  <text class="dg-text" x="149" y="33" text-anchor="middle">int</text>
  <rect class="dg-box" x="182" y="14" width="46" height="30" rx="6"/>
  <text class="dg-text" x="205" y="33" text-anchor="middle">long</text>
  <rect class="dg-warn" x="240" y="14" width="52" height="30" rx="6"/>
  <text class="dg-text" x="266" y="33" text-anchor="middle">float</text>
  <rect class="dg-box" x="304" y="14" width="50" height="30" rx="6"/>
  <text class="dg-text" x="329" y="33" text-anchor="middle">double</text>
  <line class="dg-arrow" x1="52" y1="29" x2="64" y2="29" marker-end="url(#ah)"/>
  <line class="dg-arrow" x1="116" y1="29" x2="128" y2="29" marker-end="url(#ah)"/>
  <line class="dg-arrow" x1="170" y1="29" x2="182" y2="29" marker-end="url(#ah)"/>
  <line class="dg-arrow" x1="228" y1="29" x2="240" y2="29" marker-end="url(#ah)"/>
  <line class="dg-arrow" x1="292" y1="29" x2="304" y2="29" marker-end="url(#ah)"/>
  <rect class="dg-box" x="64" y="84" width="52" height="30" rx="6"/>
  <text class="dg-text" x="90" y="103" text-anchor="middle">char</text>
  <line class="dg-line" x1="116" y1="99" x2="149" y2="99"/>
  <line class="dg-arrow" x1="149" y1="99" x2="149" y2="44" marker-end="url(#ah)"/>
  <text class="dg-label" x="166" y="76">char goes to int</text>
  <text class="dg-label" x="166" y="126">long and int to float may lose digits</text>
</svg>
:::

The ladder follows range, not size alone. `long` (64 bits) goes to `float` (32 bits) because a float can reach a far larger magnitude. The price is precision, shown below.

:::code
byte small = 100;
int mid = small;
long big = mid;
double wide = big;
System.out.println(small + " " + mid + " " + big + " " + wide);
char letter = 'z';
int code = letter;
System.out.println(code);
:::
:::out
100 100 100 100.0
122
:::

The same rule applies when you pass an argument or return a value. A `long` parameter accepts an `int` argument, so `Math.max(3, 4L)` works.

:::code
long total = 5;
double avg = total / 2;
System.out.println(avg);
System.out.println(Math.max(3, 4L));
:::
:::out
2.0
4
:::

`total / 2` is `long` division and gives 2. Only afterwards is that 2 widened to `2.0`. Widening happens at the end of the assignment, not before the division.

### Widening can still lose digits

`int` and `long` to `float`, and `long` to `double`, keep the size order but not every digit. A `float` has a 24-bit significand (about 7 decimal digits), so large integers get rounded to the nearest value it can hold.

:::code
int exact = 16_777_217;
float f = exact;
System.out.println(exact);
System.out.println((int) f);
long huge = 9_007_199_254_740_993L;
double d = huge;
System.out.println(huge);
System.out.println((long) d);
:::
:::out
16777217
16777216
9007199254740993
9007199254740992
:::

:::note
`int` to `double` is always exact (a double has 53 bits of significand). `int` to `float` and `long` to `float` or `double` can round. The compiler still allows them, because the magnitude fits.
:::

:::code fail
double ratio = 2.5;
long count = ratio;
:::
:::out
incompatible types: possible lossy conversion from double to long
:::

Going down the ladder is not silent. That direction needs a cast, see [[t1-narrowing|narrowing]].

:::q
Q: What does this print?
```java
int a = 7;
double r = a / 2;
System.out.println(r);
```
A: `3.0`
```out
3.0
```
E: `a / 2` is integer division (3). The result is widened to `3.0` only on assignment. The wrong belief is that a `double` target makes the division use doubles.
:::

:::q
Q: True or false: `long` to `float` is a widening conversion, so no information can be lost.
A: False.
E: The conversion is classed as widening and compiles without a cast, but a float keeps only about 7 digits, so large longs get rounded.
:::

:::q
Q: What does this print?
```java
char c = 'A';
int n = c;
long m = n;
System.out.println(m);
```
A: `65`
```out
65
```
E: `char` widens to `int`, which widens to `long`. The value is the character code.
:::

## Narrowing conversions and casts {#t1-narrowing}

A **narrowing conversion** moves a value into a type that may not hold it. The compiler stops you, and you must write a **cast**, the target type in parentheses. A cast says "I know this may lose data, do it anyway". It does not check anything at run time.

:::code
double price = 99.99;
int whole = (int) price;
long big = 10_000_000_000L;
int small = (int) big;
System.out.println(whole + " " + small);
:::
:::out
99 1410065408
:::

### Float to int truncates

Casting a floating point value to an integer type drops the fraction. It moves toward zero. It does not round.

:::code
System.out.println((int) 3.99);
System.out.println((int) -3.99);
System.out.println((int) 0.999999);
System.out.println((int) Math.round(3.99));
System.out.println((int) 1e20);
System.out.println((int) Double.NaN);
:::
:::out
3
-3
0
4
2147483647
0
:::

A value too big for the target saturates at `Integer.MAX_VALUE`, and `NaN` becomes 0. These are float to int rules only. Integer to integer behaves differently.

### Integer to smaller integer keeps the low bits

Casting `int` to `byte` throws away every bit above the lowest 8. The result is the value modulo 256, read as a signed number. It wraps around.

:::code
System.out.println((byte) 127);
System.out.println((byte) 128);
System.out.println((byte) 200);
System.out.println((byte) 256);
System.out.println((byte) -129);
System.out.println((short) 40000);
System.out.println((char) 65601);
:::
:::out
127
-128
-56
0
127
-25536
A
:::

:::svg Why (byte) 200 is -56
<svg viewBox="0 0 360 130">
  <text class="dg-label" x="10" y="16">int 200 in 32 bits (low byte shown)</text>
  <rect class="dg-box" x="10" y="24" width="190" height="30" rx="4"/>
  <text class="dg-text" x="105" y="44" text-anchor="middle">00...00 | 11001000</text>
  <line class="dg-arrow" x1="260" y1="54" x2="260" y2="76" marker-end="url(#ah)"/>
  <text class="dg-label" x="10" y="72">top 24 bits dropped</text>
  <rect class="dg-warn" x="200" y="84" width="150" height="30" rx="4"/>
  <text class="dg-text" x="275" y="104" text-anchor="middle">11001000</text>
  <text class="dg-label" x="10" y="104">as signed byte: 200 - 256 = -56</text>
</svg>
:::

A quick rule: for `byte`, add or subtract 256 until the value is between -128 and 127. `200 - 256 = -56`. `-129 + 256 = 127`.

:::code
int n = 200;
int low = n & 0xFF;
byte v = (byte) n;
int back = v & 0xFF;
System.out.println(low + " " + v + " " + back);
:::
:::out
200 -56 200
:::

:::dry The low 8 bits decide everything
1 | n=200 | binary 11001000 fits in 8 bits as an unsigned pattern
2 | low=200 | & 0xFF keeps only the low 8 bits, here all of them
3 | | the cast keeps the same 8 bits, but a byte reads bit 7 as the sign
3 | v=-56 | 200 - 256
4 | back=200 | v widens to -56 (32 ones then the pattern), & 0xFF keeps the low 8 bits again
5 | | all three values are ready | 200 -56 200
:::

### Cast precedence

A cast binds tighter than arithmetic. `(int) a / b` casts `a` first. Use parentheses to cast the result.

:::code
double a = 7.9;
double b = 2.1;
System.out.println((int) a + b);
System.out.println((int) (a + b));
System.out.println((int) a / (int) b);
:::
:::out
9.1
10
3
:::

The first line is `7 + 2.1`, because only `a` was cast. The second adds first (10.0) and then casts. The third is `7 / 2` in integers.

:::trap
`(int) 3.7 + 0.5` does not round to 4. The cast hits `3.7` only, so you get 3.5. To round, use `Math.round`, see [[t1-precision|precision]].
:::

### Narrowing char

`char` is unsigned 16 bit, so a cast to `char` keeps the low 16 bits. A cast of a negative number gives a large code, not a negative one.

:::code
char c = (char) -1;
System.out.println((int) c);
short s = (short) c;
System.out.println(s);
:::
:::out
65535
-1
:::

:::q
Q: What does this print?
```java
System.out.println((int) -2.9 + " " + (int) 2.9);
```
A: `-2 2`
```out
-2 2
```
E: A cast truncates toward zero. The wrong belief is that it behaves like `Math.floor` for negatives, which would give -3.
:::

:::q
Q: What is `(byte) 130`?
```java
System.out.println((byte) 130);
```
A: `-126`
```out
-126
```
E: 130 is above 127, so it wraps: 130 - 256 = -126.
:::

:::q
Q: Does this compile?
```java
int n = 5;
short s = n;
```
A: No.
```err
possible lossy conversion from int to short
```
E: `n` is not a constant, so the compiler cannot prove it fits. A cast `(short) n` fixes it, at your own risk.
:::

## Precision, overflow and division {#t1-precision}

Computers store numbers in binary with a fixed number of bits. Integers wrap around when they run out of range. Floating point numbers cannot store most decimal fractions exactly. Both facts cause real bugs in money, averages and loop counters.

### Floating point is approximate

`0.1` has no exact binary form, just as 1/3 has no exact decimal form. Each `double` holds the nearest value it can, and small errors show up after arithmetic.

:::code
System.out.println(0.1 + 0.2);
System.out.println(0.1 + 0.2 == 0.3);
System.out.println(1.1 * 3);
System.out.println(0.5 + 0.25 == 0.75);
float f = 0.1f;
double d = 0.1;
System.out.println(f == d);
System.out.println((double) f);
:::
:::out
0.30000000000000004
false
3.3000000000000003
true
false
0.10000000149011612
:::

`0.5` and `0.25` are sums of powers of two, so they are exact. `0.1` is not. A `float` rounds `0.1` more coarsely than a `double`, so the two are different numbers.

:::trap
Never test floating point values with `==`. Compare the distance instead: `Math.abs(a - b) < 1e-9`. Pick a tolerance that fits the size of your numbers.
:::

:::code
double a = 0.1 + 0.2;
double b = 0.3;
System.out.println(Math.abs(a - b) < 1e-9);
:::
:::out
true
:::

### NaN and Infinity

Floating point division never throws. It produces special values.

:::code
System.out.println(1.0 / 0);
System.out.println(-1.0 / 0);
System.out.println(0.0 / 0);
double nan = 0.0 / 0;
System.out.println(nan == nan);
System.out.println(Double.isNaN(nan));
System.out.println(1.0 / 0 > Double.MAX_VALUE);
:::
:::out
Infinity
-Infinity
NaN
false
true
true
:::

`NaN` means "not a number". It is not equal to anything, not even itself, so test it with `Double.isNaN`. Integer division by zero is different, see below.

### Integer division and double division

If both operands are integers, `/` is integer division and drops the remainder. One `double` operand makes the whole operation floating point.

:::code
int marks = 7;
int papers = 2;
System.out.println(marks / papers);
System.out.println(marks / (double) papers);
System.out.println((double) (marks / papers));
System.out.println(marks / 2.0);
System.out.println(marks % papers);
:::
:::out
3
3.5
3.0
3.5
1
:::

The cast position matters. `(double) (marks / papers)` divides first, and the information is already gone.

:::code
int zero = 0;
System.out.println(5.0 / zero);
System.out.println(5 / zero);
:::
:::out
Infinity
Exception in thread "main" java.lang.ArithmeticException: / by zero
:::

### Rounding on purpose

Casting truncates. For other behaviour use `Math`.

:::code
double x = 2.5;
System.out.println(Math.round(x));
System.out.println(Math.round(-2.5));
System.out.println(Math.floor(-2.5));
System.out.println(Math.ceil(-2.5));
System.out.println(Math.round(2.4));
System.out.println(Math.round(x * 100) / 100.0);
:::
:::out
3
-2
-3.0
-2.0
2
2.5
:::

`Math.round` rounds halves toward positive infinity, so -2.5 becomes -2. It returns a `long` for a `double` argument. `floor` and `ceil` return `double`.

### Integer overflow wraps silently

An `int` that goes past its maximum does not fail. It wraps to the other end of the range.

:::code
int max = Integer.MAX_VALUE;
System.out.println(max + 1);
System.out.println(Integer.MIN_VALUE - 1);
System.out.println(Math.abs(Integer.MIN_VALUE));
long safe = max + 1L;
System.out.println(safe);
:::
:::out
-2147483648
2147483647
-2147483648
2147483648
:::

:::svg The int number circle
<svg viewBox="0 0 360 150">
  <rect class="dg-box" x="10" y="20" width="340" height="34" rx="6"/>
  <text class="dg-label" x="16" y="42">MIN</text>
  <text class="dg-text" x="180" y="42" text-anchor="middle">0</text>
  <text class="dg-label" x="316" y="42">MAX</text>
  <path class="dg-arrow" d="M 330 56 C 330 110 30 110 30 56" fill="none" marker-end="url(#ah)"/>
  <text class="dg-text" x="180" y="106" text-anchor="middle">MAX + 1 wraps to MIN</text>
  <text class="dg-label" x="180" y="128" text-anchor="middle">abs(MIN) also stays negative: no positive twin</text>
</svg>
:::

:::dry Overflow in a running total
int n = 2_000_000_000;
int total = 0;
total += n;
total += n;
---
1 | n=2000000000 | two billion fits in int, the largest int is 2147483647
2 | total=0 | total starts at zero
3 | total=2000000000 | 0 + 2000000000 still fits
4 | | the true sum is 4000000000, which is above 2147483647
4 | total=-294967296 | no error is raised: the result wraps, 4000000000 - 4294967296
4 | | an int total that overflows silently gives a wrong, often negative, answer
:::

Detect overflow with the `Exact` methods, which throw instead of wrapping.

:::code
int a = Integer.MAX_VALUE;
try {
    int r = Math.addExact(a, 1);
    System.out.println(r);
} catch (ArithmeticException e) {
    System.out.println("caught: " + e.getMessage());
}
System.out.println(Math.multiplyExact(1000, 1000));
:::
:::out
caught: integer overflow
1000000
:::

### Money needs exact decimals

For prices, never use `double`. Store whole cents in a `long`, or use `BigDecimal`, a class that keeps exact decimal digits. Build it from a String, not from a double.

:::code
import java.math.BigDecimal;
BigDecimal x = new BigDecimal("0.1");
BigDecimal y = new BigDecimal("0.2");
System.out.println(x.add(y));
System.out.println(x.add(y).equals(new BigDecimal("0.3")));
:::
:::out
0.3
true
:::

:::q
Q: What does this print?
```java
System.out.println(5 / 2 + " " + 5 / 2.0 + " " + 5 % 2);
```
A: `2 2.5 1`
```out
2 2.5 1
```
E: Two ints divide as ints. One double operand makes the division floating point. The wrong belief is that `/` always keeps the fraction.
:::

:::q
Q: What does this print?
```java
double sum = 0;
for (int i = 0; i < 10; i++) sum += 0.1;
System.out.println(sum == 1.0);
```
A: `false`
```out
false
```
E: Ten additions of the inexact 0.1 give 0.9999999999999999, not 1.0. This is why loops with `double` counters and `==` tests are risky.
:::

:::q
Q: What does `Integer.MAX_VALUE + 1` evaluate to, and does Java warn you?
A: `-2147483648`, with no warning.
E: `int` arithmetic wraps around in two's complement. Use `long` or `Math.addExact` when overflow is possible.
:::

## Numeric promotion {#t1-promotion}

Java does not do arithmetic on `byte`, `short` or `char`. Before an operator runs, those operands are promoted. This is called **binary numeric promotion**. The rules, in order:

1. If either operand is `double`, both become `double`.
2. Otherwise if either is `float`, both become `float`.
3. Otherwise if either is `long`, both become `long`.
4. Otherwise both become `int`.

So the result type of `+ - * / %` is never smaller than `int`.

:::code fail
byte a = 10;
byte b = 20;
byte c = a + b;
:::
:::out
possible lossy conversion from int to byte
:::

`a + b` is an `int`. Putting it back into a `byte` needs a cast: `byte c = (byte) (a + b);`.

:::code
byte a = 10;
byte b = 20;
byte c = (byte) (a + b);
char x = 'a';
char y = 'b';
System.out.println(c + " " + (x + y) + " " + (char) (x + 1));
short s = 5;
long big = 2;
System.out.println(((Object) (s * 2)).getClass().getSimpleName());
System.out.println(((Object) (s * big)).getClass().getSimpleName());
System.out.println(((Object) (s * 2.0f)).getClass().getSimpleName());
:::
:::out
30 195 b
Integer
Long
Float
:::

### Compound assignment hides a cast

`b += 1` is not the same as `b = b + 1`. A compound assignment contains an implicit cast back to the type of the left side.

:::code
byte b = 120;
b += 10;
System.out.println(b);
int i = 10;
i *= 1.5;
System.out.println(i);
char ch = 'a';
ch += 2;
ch++;
System.out.println(ch);
:::
:::out
-126
15
d
:::

The line `b += 10` compiled, with the wraparound from [[t1-narrowing|narrowing]]. The line `i *= 1.5` computed 15.0 and cast it to 15. The same code written as `b = b + 10` would not compile. The rule: `a op= x` means `a = (T)(a op x)` where `T` is the type of `a`.

:::dry byte b += 10 step by step
byte b = 120;
b += 10;
b++;
System.out.println(b);
---
1 | b=120 | 120 fits in a byte
2 | | b is promoted to int, 120 + 10 = 130
2 | b=-126 | the hidden cast keeps the low 8 bits: 130 - 256
3 | b=-125 | ++ also has a hidden cast, -126 + 1
4 | | the byte is widened to int for printing | -125
4 | | b = b + 10 would not compile, but b += 10 hides the cast
:::

### Constants may narrow without a cast

If an `int` is a **constant expression** and its value fits in the target, the compiler allows the assignment with no cast. A variable that is not `final` is not a constant.

:::code
byte ok = 100;
char letter = 66;
final int LIMIT = 50;
byte fine = LIMIT;
System.out.println(ok + " " + letter + " " + fine);
:::
:::out
100 B 50
:::

:::code fail
byte tooBig = 200;
:::
:::out
possible lossy conversion from int to byte
:::

### Ternary promotion

The two branches of `?:` are also promoted to a common type, and the whole expression has that type, even if the other branch is chosen.

:::code
boolean yes = true;
System.out.println(yes ? 1 : 2.0);
System.out.println(yes ? 'a' : 0);
int zero = 0;
System.out.println(yes ? 'a' : zero);
:::
:::out
1.0
a
97
:::

The first prints `1.0`, because the type of `1 : 2.0` is `double`. In the second, `0` is a constant that fits a `char`, so the type is `char`. In the third, `zero` is a real `int` variable, so the type is `int`.

:::q
Q: Does this compile?
```java
short a = 1;
short b = 2;
short c = a + b;
```
A: No.
```err
possible lossy conversion from int to short
```
E: `a + b` is promoted to `int`. Use `(short) (a + b)`, or `int c`.
:::

:::q
Q: What does this print?
```java
byte b = 127;
b++;
System.out.println(b);
```
A: `-128`
```out
-128
```
E: `b++` contains a hidden cast and the value wraps. The wrong belief is that a byte stops at 127.
:::

:::q
Q: What does this print?
```java
System.out.println('a' + 'b' + "c" + 'd' + 1);
```
A: `195cd1`
```out
195cd1
```
E: `'a' + 'b'` is int addition (97 + 98). After that the left side is a String, so the rest is concatenation.
:::

## Operators and surprises {#t1-operators}

Most operator bugs come from a few rules that beginners skim: integer division and remainder with negative numbers, the order in which `++` is evaluated, short-circuiting, and precedence.

### Division and remainder with negatives

Integer `/` truncates toward zero. `%` is defined so that `(a / b) * b + (a % b) == a`. The remainder takes the sign of the left operand.

:::code
System.out.println(7 / 2 + " " + 7 % 2);
System.out.println(-7 / 2 + " " + -7 % 2);
System.out.println(7 / -2 + " " + 7 % -2);
System.out.println(-7 / -2 + " " + -7 % -2);
System.out.println(Math.floorMod(-7, 3));
System.out.println(-7 % 3);
:::
:::out
3 1
-3 -1
-3 1
3 -1
2
-1
:::

:::trap
`x % 2 == 1` is false for negative odd numbers, because `-3 % 2` is -1. Test oddness with `x % 2 != 0`. For a wrap-around index use `Math.floorMod(i, n)`.
:::

### Increment and decrement

`i++` gives the old value and then adds 1. `++i` adds 1 and gives the new value.

:::code
int i = 5;
int a = i++;
int b = ++i;
System.out.println(a + " " + b + " " + i);
i = 5;
i = i++;
System.out.println(i);
i = 5;
i = i++ + ++i;
System.out.println(i);
:::
:::out
5 7 7
5
12
:::

`i = i++` leaves `i` unchanged. Java reads the old value 5, adds 1 to `i`, and then the assignment writes the old 5 back over it.

:::dry i = i++ + ++i
int i = 5;
i = i++ + ++i;
System.out.println(i);
---
1 | i=5 | start
2 | | left operand i++ is evaluated first: its value is 5
2 | i=6 | the side effect of i++ happens now
2 | i=7 | right operand ++i adds 1 first, so its value is 7
2 | i=12 | 5 + 7 is assigned and replaces the 7
3 | | prints i | 12
:::

Left to right is guaranteed in Java (unlike C), so this answer is stable. Still, never write it in real code.

### Short-circuit and the plain operators

`&&` and `||` stop as soon as the answer is known. The right side is then not run at all. The single `&` and `|` always run both sides.

:::code
int n = 0;
boolean r1 = (n != 0) && (10 / n > 1);
System.out.println(r1);
int count = 0;
boolean r2 = (count++ > 0) && (count++ > 0);
System.out.println(count);
boolean r3 = (count++ > 5) & (count++ > 5);
System.out.println(count);
:::
:::out
false
1
3
:::

The first line is safe because `n != 0` is false, so `10 / n` never runs. `&&` is the standard guard against a zero or null.

### Precedence traps

| From high to low | Operators |
|---|---|
| postfix, unary | `i++` `i--` `++i` `!` `-x` cast |
| multiplicative | `*` `/` `%` |
| additive | `+` `-` |
| shift | `<<` `>>` |
| relational | `<` `>` `<=` `>=` |
| equality | `==` `!=` |
| bitwise | `&` then `^` then `\|` |
| logical | `&&` then `\|\|` |
| ternary, assignment | `?:` `=` `+=` |

:::code
int a = 2, b = 3, c = 4;
System.out.println(a + b * c);
System.out.println((a + b) * c);
System.out.println("sum=" + a + b);
System.out.println("sum=" + (a + b));
System.out.println(a + b + "=sum");
System.out.println(a < b == b < c);
boolean p = true, q = false;
System.out.println(p || q && q);
System.out.println(1 + 2 << 1);
:::
:::out
14
20
sum=23
sum=5
5=sum
true
true
6
:::

`+` is left to right, and once one side is a String it concatenates. `&&` binds tighter than `||`, so `p || q && q` is `p || (q && q)`. When in doubt add parentheses, that is what a reader wants anyway.

### Bitwise basics

`&`, `|`, `^`, `~`, `<<` and `>>` work on bits. Shifting left by one doubles, and right by one halves (for non-negative values).

:::code
int x = 12;
System.out.println(x & 5);
System.out.println(x | 5);
System.out.println(x ^ 5);
System.out.println(x << 2);
System.out.println(x >> 2);
System.out.println(-16 >> 2);
System.out.println(-16 >>> 28);
:::
:::out
4
13
9
48
3
-4
15
:::

12 is `1100` and 5 is `0101`. AND keeps bits set in both (`0100` = 4), OR in either (`1101` = 13), XOR in exactly one (`1001` = 9). `>>` keeps the sign. `>>>` fills with zeros.

:::q
Q: What does this print?
```java
System.out.println(-9 / 4 + " " + -9 % 4);
```
A: `-2 -1`
```out
-2 -1
```
E: `/` truncates toward zero (-2.25 to -2). The remainder keeps the sign of the left operand, and -2 * 4 + (-1) is -9.
:::

:::q
Q: What does this print?
```java
int x = 3;
x = x++ * 2 + x;
System.out.println(x);
```
A: `10`
```out
10
```
E: `x++` gives 3 and sets x to 4. Then `3 * 2 + 4` is 10. The wrong belief is that the second `x` still sees 3.
:::

:::q
Q: Does `if (obj != null && obj.length() > 3)` throw when `obj` is null?
A: No.
E: `&&` short-circuits. When `obj != null` is false, the right side is skipped. With a single `&` it would throw a NullPointerException.
:::

## Topic test {#t1-test}

:::q tags=t1-promotion,t1-narrowing
Q: What does this print?
```java
byte b = 100;
b += 100;
System.out.println(b);
```
A: `-56`
```out
-56
```
E: `b += 100` means `b = (byte)(b + 100)`. The sum is the int 200, which does not fit in a byte, so the cast keeps the low 8 bits: 200 - 256 = -56. The wrong belief is that a compound assignment reports an overflow or refuses to compile.
:::

:::q tags=t1-precision,t1-widening
Q: What does this print?
```java
System.out.println(0.1 + 0.2 == 0.3);
System.out.println(0.1f + 0.2f == 0.3f);
```
A: `false` then `true`.
```out
false
true
```
E: In `double`, 0.1 + 0.2 is 0.30000000000000004, which is not the double nearest to 0.3. In `float` the rounding happens to land on the same value as the literal `0.3f`. Neither result is a rule to rely on: compare floating-point numbers with a tolerance.
:::

:::q tags=t1-operators
Q: What does this print?
```java
int i = 5;
i = i++ + ++i;
System.out.println(i);
```
A: `12`
```out
12
```
E: Operands are evaluated left to right. `i++` yields 5 and sets i to 6. `++i` then makes i 7 and yields 7. The sum 5 + 7 is stored into i, so the increments are overwritten.
:::

:::q tags=t1-literals,t1-widening
Q: Does this compile?
```java
float f = 3.14;
```
A: No.
```err
incompatible types: possible lossy conversion from double to float
```
E: A literal with a decimal point is a `double`. Going from `double` to `float` can lose information, so Java demands a cast or the suffix: `3.14f`.
:::

:::q tags=t1-widening,t1-precision
Q: What does this print?
```java
int x = 16777217;
float f = x;
System.out.println((int) f);
```
A: `16777216`
```out
16777216
```
E: Widening `int` to `float` is allowed without a cast, but a `float` has only 24 bits of precision. Above 16,777,216 it cannot represent every integer, so 16777217 is rounded. "Widening" means the range grows, not that the value is always exact.
:::

:::q tags=t1-scope,t1-shadowing
Q: A new account is created with 500 but prints 0. Find the bug.
```java
public class Main {
    static class Account {
        int balance;
        Account(int balance) {
            balance = balance;
        }
    }

    public static void main(String[] args) {
        Account a = new Account(500);
        System.out.println(a.balance);
    }
}
```
A: The parameter shadows the field, so the field is never assigned.
```out
0
```
E: Inside the constructor, `balance` means the parameter. `balance = balance` assigns the parameter to itself and the field keeps its default 0. Write `this.balance = balance`.
:::

:::q tags=t1-scope
Q: Does this compile?
```java
int count;
for (int i = 0; i < 3; i++) {
    count = i;
}
System.out.println(count);
```
A: No.
```err
variable count might not have been initialized
```
E: A local variable has no default value, and the compiler must be sure it is assigned on every path. It cannot know the loop body runs at least once, so `count` may be unassigned at the `println`.
:::

:::q tags=t1-final,t1-narrowing
Q: Does this compile? What changes if `final` is added to `int a`?
```java
int a = 10;
byte b = a;
```
A: It does not compile as written. With `final int a = 10;` it compiles.
```err
incompatible types: possible lossy conversion from int to byte
```
E: A plain `int` variable could hold any value, so the narrowing needs a cast. A `final` variable with a constant initializer is a compile-time constant, and the compiler can see that 10 fits in a byte, so it allows the assignment.
:::

:::q tags=t1-narrowing,t1-precision
Q: What does this print?
```java
System.out.println((int) 3.99 + " " + (int) -3.99 + " " + Math.round(-3.5) + " " + (byte) 200);
```
A: `3 -3 -3 -56`
```out
3 -3 -3 -56
```
E: A cast to `int` truncates toward zero, it does not round. `Math.round(-3.5)` is floor(-3.5 + 0.5) = -3, so halves round up, toward positive infinity. `(byte) 200` keeps the low 8 bits: 200 - 256 = -56.
:::

:::q tags=t1-prim-ref
Q: What does this print?
```java
int[] a = {1, 2, 3};
int[] b = a;
b[0] = 99;
int x = 5;
int y = x;
y++;
System.out.println(a[0] + " " + x + " " + y);
```
A: `99 5 6`
```out
99 5 6
```
E: A primitive variable holds its value, so `y = x` copies the 5 and the two variables are independent. An array variable holds a reference, so `b = a` copies the reference and both names reach the same array.
:::

:::q tags=t1-primitives,t1-promotion
Q: Does this compile?
```java
char c = 'A';
c = c + 1;
```
A: No.
```err
incompatible types: possible lossy conversion from int to char
```
E: In `c + 1` the `char` is promoted to `int`, and the result is an `int`. Assigning it back to a `char` needs a cast. `c += 1` and `c++` compile because they include a hidden cast.
:::

:::q tags=t1-widening,t1-narrowing,t1-primitives
Q: Which statement is true?
1. Converting a `long` to a `float` never loses information.
2. Converting an `int` to a `double` never loses information.
3. `(int) 1e10` wraps around like `(byte) 200`.
4. A `char` can hold negative values.
A: Statement 2.
E: A `double` has 53 bits of precision, enough for every `int`. A `long` has 64 bits and a `float` only 24, so 1 is false. Casting an out-of-range `double` to `int` saturates at `Integer.MAX_VALUE`, it does not wrap, so 3 is false. `char` is unsigned, so 4 is false.
:::
