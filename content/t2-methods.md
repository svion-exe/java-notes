# Methods
id: t2
summary: How to declare, call, overload and design methods, why Java is always pass-by-value, and how the call stack works.

## Anatomy of a method {#t2-anatomy}

A method is a named block of code that you can run from many places. You write the steps once, give them a name, and call that name whenever you need them. Without methods, every program is one long `main`: the same logic is copied and pasted, a bug has to be fixed in ten places, and nobody can read it. Methods let you split a problem into small pieces, test each piece, and reuse it.

Here is the smallest useful method and a call to it.

:::code
public class Main {
    static int square(int n) {
        return n * n;
    }

    public static void main(String[] args) {
        int result = square(5);
        System.out.println(result);
    }
}
:::
:::out
25
:::

The first line of a method is its **header**. The braces and everything inside are its **body**.

:::svg Parts of a method header
<svg viewBox="0 0 360 150">
  <rect class="dg-box" x="8" y="40" width="62" height="34" rx="6"/>
  <text class="dg-text" x="39" y="62" text-anchor="middle">static</text>
  <rect class="dg-box" x="78" y="40" width="46" height="34" rx="6"/>
  <text class="dg-text" x="101" y="62" text-anchor="middle">int</text>
  <rect class="dg-hl" x="132" y="40" width="86" height="34" rx="6"/>
  <text class="dg-text" x="175" y="62" text-anchor="middle">square</text>
  <rect class="dg-box" x="226" y="40" width="126" height="34" rx="6"/>
  <text class="dg-text" x="289" y="62" text-anchor="middle">(int n)</text>
  <line class="dg-line" x1="39" y1="78" x2="39" y2="104"/>
  <text class="dg-label" x="39" y="118" text-anchor="middle">modifier</text>
  <line class="dg-line" x1="101" y1="78" x2="101" y2="104"/>
  <text class="dg-label" x="101" y="132" text-anchor="middle">return type</text>
  <line class="dg-arrow" x1="175" y1="78" x2="175" y2="104"/>
  <text class="dg-label" x="175" y="118" text-anchor="middle">name</text>
  <line class="dg-line" x1="289" y1="78" x2="289" y2="104"/>
  <text class="dg-label" x="289" y="118" text-anchor="middle">parameter list</text>
  <text class="dg-label" x="175" y="20" text-anchor="middle">signature = name + parameter types</text>
  <line class="dg-line" x1="132" y1="28" x2="352" y2="28"/>
</svg>
:::

- **Modifiers** such as `static` and `public` say who can call the method and how. For now every method in these notes is `static`; the meaning is in [[t2-static|static vs instance methods]].
- **Return type** is the type of the value the method hands back. `void` means it hands back nothing.
- **Name** follows the variable rules: starts lowercase, camelCase, and is a verb or verb phrase (`square`, `printGrade`, `isEmpty`).
- **Parameters** are the local variables listed in the parentheses. They get their values from the call.
- The **signature** is the name plus the parameter types, in order. The return type and the parameter names are not part of it. This matters for [[t2-overloading|overloading]].

The values you put in the call are **arguments**. The names in the declaration are **parameters**. In `square(5)`, `5` is the argument and `n` is the parameter.

### What a call does

When `square(side)` runs, Java evaluates the argument, copies its value into the parameter `n`, runs the body, and replaces the call expression with the returned value.

:::code
public class Main {
    static int square(int n) {
        return n * n;
    }

    public static void main(String[] args) {
        int side = 4;
        int area = square(side);
        System.out.println(area);
    }
}
:::
:::out
16
:::
:::dry One call from start to finish
7 | side=4 | main stores 4 in side
8 | | the call square(side) starts; the argument side is evaluated to 4
2 | n=4 | a new parameter n is created and receives a copy of 4
3 | | n * n is 16
8 | area=16;~n | the call returns 16, n is gone, the call expression becomes 16
9 | | prints the stored value | 16
:::

### void methods and early return

A `void` method returns nothing, so it is called as a statement. `return;` inside it ends the method at once. Use an early return to handle the bad cases first; the rest of the method then reads straight down.

:::code
public class Main {
    static void printGrade(int marks) {
        if (marks < 0 || marks > 100) {
            System.out.println("invalid marks");
            return;
        }
        String grade = marks >= 40 ? "pass" : "fail";
        System.out.println(marks + " -> " + grade);
    }

    public static void main(String[] args) {
        printGrade(72);
        printGrade(-5);
        printGrade(30);
    }
}
:::
:::out
72 -> pass
invalid marks
30 -> fail
:::

### Rules the compiler enforces

A method with a non-void return type must return a value on **every** path. If the compiler can find a way to reach the closing brace without a `return`, it refuses.

:::code fail
public class Main {
    static int sign(int x) {
        if (x > 0) {
            return 1;
        } else if (x < 0) {
            return -1;
        }
    }

    public static void main(String[] args) {
        System.out.println(sign(3));
    }
}
:::
:::out
missing return statement
:::

The compiler does not know that `x` is never zero. Add a final `return 0;` or make the last branch a plain `else`.

Arguments must fit the parameter types. A `byte`, `int` or `char` argument fits a `long` parameter by widening ([[t1-widening|widening]]), but a `double` does not fit an `int` parameter without a cast ([[t1-narrowing|narrowing]]).

:::code fail
public class Main {
    static int square(int n) {
        return n * n;
    }

    public static void main(String[] args) {
        System.out.println(square(3.5));
    }
}
:::
:::out
incompatible types: possible lossy conversion from double to int
:::

:::note
Good method names are verbs: `calculateTotal`, `printReport`. A method that answers a yes/no question starts with `is`, `has` or `can`: `isEven`, `hasPassed`. If you cannot name a method without using "and", it does too much.
:::

:::q
Q: What does this print?
```java
public class Main {
    static int twice(int n) {
        return n * 2;
    }

    public static void main(String[] args) {
        twice(10);
        System.out.println(twice(3));
    }
}
```
A: 
```out
6
```
E: The first call computes 20 and the value is thrown away; calling a method as a statement is legal even when it returns something. Only the second call is printed.
:::

:::q
Q: In `static double average(int a, int b)`, which parts belong to the signature?
A: Only `average(int, int)`.
E: The signature is the name and the ordered parameter types. The return type `double`, the modifier `static` and the parameter names `a` and `b` are not part of it.
:::

## Pass-by-value {#t2-pass-by-value}

Java is **always pass-by-value**. When you call a method, each argument is evaluated and a **copy of its value** is put into the matching parameter. The method works on its own copy. It can never change the variable in the caller, because it has no access to that variable, only to a copy of what was in it.

This is the most important idea in the topic. Learn it with primitives first, because there is nothing else to confuse it with.

:::code
public class Main {
    static void bump(int n) {
        n = n + 10;
        System.out.println("inside: " + n);
    }

    public static void main(String[] args) {
        int score = 50;
        bump(score);
        System.out.println("after: " + score);
    }
}
:::
:::out
inside: 60
after: 50
:::

`bump` changed `n`, not `score`. Follow the memory. Each method call gets its own **stack frame**: a private box that holds that call's parameters and local variables. See [[t2-call-stack|the call stack]] for the full picture.

:::mem 1. Before the call: only main has a frame
stack
  frame main
  score = 50
caption: main has one local variable, score.
:::

:::mem 2. Inside bump, just after the call starts
stack
  frame main
  score = 50
  frame bump
  *n = 50
caption: n is a new variable in a new frame. It received a copy of the value 50.
:::

:::mem 3. Inside bump, after n = n + 10
stack
  frame main
  score = 50
  frame bump
  *n = 60
caption: Only n changed. score is in a different frame and nothing connects them.
:::

:::mem 4. After the call returns
stack
  frame main
  score = 50
caption: The frame of bump is gone, and n with it. score is still 50.
:::

:::dry Tracing bump
8 | score=50 | main stores 50 in score
9 | | the call bump(score) copies 50 into the parameter
2 | n=50 | n starts as a copy of score
3 | n=60 | only n changes
4 | | prints the parameter | inside: 60
9 | ~n | bump returns and its frame is discarded
10 | | score was never touched | after: 50
:::

The names do not link anything either. A parameter can have the same name as the caller's variable; they are still two separate variables in two separate frames.

:::code
public class Main {
    static void reset(int count) {
        count = 0;
    }

    public static void main(String[] args) {
        int count = 7;
        reset(count);
        System.out.println(count);
    }
}
:::
:::out
7
:::

:::mem Same name, two variables
stack
  frame main
  count = 7
  frame reset
  *count = 0
caption: Each frame has its own count. Assigning in reset changes only reset's count.
:::

Assigning to a parameter is legal but a common source of confusion. Mark a parameter `final` to make the compiler stop you.

:::code fail
public class Main {
    static int addTax(final int price) {
        price = price + 5;
        return price;
    }

    public static void main(String[] args) {
        System.out.println(addTax(100));
    }
}
:::
:::out
final parameter price may not be assigned
:::

:::trap
Beginners write a method `void increment(int x) { x++; }` and expect the caller's variable to grow. It cannot. If a method must give a new value back, **return it** and assign it: `count = increment(count);`.
:::

:::interview
Is Java pass-by-value or pass-by-reference? Always pass-by-value. For objects, the value that is copied is the reference itself ([[t2-reference-params|next subtopic]]).
:::

:::q
Q: What does this print?
```java
public class Main {
    static int addOne(int x) {
        x = x + 1;
        return x;
    }

    public static void main(String[] args) {
        int a = 5;
        addOne(a);
        System.out.println(a);
        a = addOne(a);
        System.out.println(a);
    }
}
```
A: 
```out
5
6
```
E: The first call returns 6 but nothing stores it, and `a` was never changed. The second call assigns the returned value to `a`. The wrong belief is that changing a parameter changes the caller's variable.
:::

:::q
Q: True or false: if a parameter has the same name as a variable in the caller, assigning to the parameter changes the caller's variable.
A: False.
E: They are two variables in two frames. The name is only a label inside its own method.
:::

## Reference parameters {#t2-reference-params}

Pass-by-value does not change when the argument is an object. What changes is **what the value is**. A variable of a class type does not hold the object; it holds a [[t1-prim-ref|reference]] to an object on the heap. Passing it copies that reference. The caller and the method then hold two references to the **same** object.

That gives two different outcomes, and you must keep them apart:

1. Using the copied reference to change the object (`acc.balance = ...`) is **visible** to the caller, because there is only one object.
2. Assigning a new value to the parameter (`acc = new Account(...)`) is **not visible**, because it only changes the method's own copy of the reference.

We use a small class for all the examples.

:::code
class Account {
    String owner;
    int balance;

    Account(String owner, int balance) {
        this.owner = owner;
        this.balance = balance;
    }
}

public class Main {
    static void deposit(Account acc, int amount) {
        acc.balance = acc.balance + amount;
    }

    public static void main(String[] args) {
        Account a = new Account("Ana", 100);
        deposit(a, 50);
        System.out.println(a.balance);
    }
}
:::
:::out
150
:::

:::mem 1. Before the call
stack
  frame main
  a -> #1
heap
  #1 Account : owner -> #2 | balance = 100
pool
  #2 String : "Ana"
caption: One Account object. Only main's a points to it.
:::

:::mem 2. Inside deposit, at the start
stack
  frame main
  a -> #1
  frame deposit
  *acc -> #1
  amount = 50
heap
  #1 Account : owner -> #2 | balance = 100
pool
  #2 String : "Ana"
caption: acc received a copy of the reference. Two arrows, one object. The int amount is copied as before.
:::

:::mem 3. After acc.balance = acc.balance + amount
stack
  frame main
  a -> #1
  frame deposit
  acc -> #1
  amount = 50
heap
  *#1 Account : owner -> #2 | balance = 150
pool
  #2 String : "Ana"
caption: The write went through acc to the shared object. main sees it through a.
:::

:::mem 4. After the call returns
stack
  frame main
  a -> #1
heap
  *#1 Account : owner -> #2 | balance = 150
pool
  #2 String : "Ana"
caption: The frame of deposit and its reference are gone. The object stays because a still points to it.
:::

### Reassigning the parameter

Now the method assigns a new object to its parameter.

:::code
class Account {
    String owner;
    int balance;

    Account(String owner, int balance) {
        this.owner = owner;
        this.balance = balance;
    }
}

public class Main {
    static void replace(Account acc) {
        acc = new Account("Zed", 0);
        System.out.println("inside: " + acc.owner);
    }

    public static void main(String[] args) {
        Account a = new Account("Ana", 100);
        replace(a);
        System.out.println("after: " + a.owner);
    }
}
:::
:::out
inside: Zed
after: Ana
:::

:::mem Inside replace, after acc = new Account("Zed", 0)
stack
  frame main
  a -> #1
  frame replace
  *acc -> #3
heap
  #1 Account : owner -> #2 | balance = 100
  *#3 Account : owner -> #4 | balance = 0
pool
  #2 String : "Ana"
  #4 String : "Zed"
caption: acc was turned to point at a new object. The arrow from a was never touched, so main still sees Ana.
:::

### Both at once

This is the classic test. Read the three lines of the method slowly.

:::code
class Account {
    String owner;
    int balance;

    Account(String owner, int balance) {
        this.owner = owner;
        this.balance = balance;
    }
}

public class Main {
    static void change(Account acc) {
        acc.balance = 500;
        acc = new Account("Zed", 1);
        acc.balance = 999;
    }

    public static void main(String[] args) {
        Account a = new Account("Ana", 100);
        change(a);
        System.out.println(a.owner + " " + a.balance);
    }
}
:::
:::out
Ana 500
:::
:::dry Which write reaches main?
19 | a=Account#1;balance1=100 | main creates Ana with balance 100 (balance1 is the balance of object #1)
20 | | call change(a)
13 | acc=Account#1;balance1=500 | acc is a copy of the reference, so this changes the shared object
14 | acc=Account#2;balance2=1 | acc now points to a different object
15 | balance2=999 | this changes only the new object
16 | ~acc | the method ends; Account#2 has no references left
21 | | a still points to #1, balance 500 | Ana 500
:::

### Arrays are objects too

An array parameter behaves exactly like the Account: you receive a copy of the reference to the array. Writing into the elements is seen by the caller; assigning a new array to the parameter is not. ([[t4-memory|Array memory layout]] is covered in the arrays topic.)

:::code
public class Main {
    static void doubleAll(int[] marks) {
        for (int i = 0; i < marks.length; i++) {
            marks[i] = marks[i] * 2;
        }
    }

    static void wipe(int[] marks) {
        marks = new int[] {0, 0, 0};
    }

    public static void main(String[] args) {
        int[] marks = {10, 20, 30};
        doubleAll(marks);
        System.out.println(Arrays.toString(marks));
        wipe(marks);
        System.out.println(Arrays.toString(marks));
    }
}
:::
:::out
[20, 40, 60]
[20, 40, 60]
:::

:::mem Inside wipe, after the reassignment
stack
  frame main
  marks -> #1
  frame wipe
  *marks -> #2
heap
  #1 int[] : 20 | 40 | 60
  *#2 int[] : 0 | 0 | 0
caption: Both variables are named marks, but they are in different frames. The one in wipe now points to a new array. The original array is untouched.
:::

### Strings and wrappers: immutable, so no visible change

A `String` is [[t5-immutability|immutable]]: no method can change its characters. Every "change" produces a new String. So assigning to a String parameter is just a reassignment of the local reference, and the caller never sees it. `Integer` and the other wrapper classes are immutable too ([[t7-wrappers|wrapper classes]] come later).

:::code
public class Main {
    static void shout(String s) {
        s = s.toUpperCase();
        System.out.println("inside: " + s);
    }

    static void addBonus(Integer marks) {
        marks = marks + 10;
        System.out.println("inside: " + marks);
    }

    public static void main(String[] args) {
        String name = "ana";
        shout(name);
        System.out.println("after: " + name);
        Integer marks = 70;
        addBonus(marks);
        System.out.println("after: " + marks);
    }
}
:::
:::out
inside: ANA
after: ana
inside: 80
after: 70
:::

:::mem Inside shout, after s = s.toUpperCase()
stack
  frame main
  name -> #1
  frame shout
  *s -> #2
heap
  *#2 String : "ANA"
pool
  #1 String : "ana"
caption: toUpperCase built a new String. s points to it. name still points to "ana".
:::

Contrast this with a mutable object such as `StringBuilder` ([[t5-builder|StringBuilder]] is covered later), where the method can change the one shared object.

:::code
public class Main {
    static void addMark(StringBuilder sb) {
        sb.append("!");
    }

    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("done");
        addMark(sb);
        System.out.println(sb);
    }
}
:::
:::out
done!
:::

### Passing null

`null` is a valid reference value. A parameter can receive it, and then it points to nothing. Calling a method on it throws `NullPointerException`.

:::code
public class Main {
    static int safeLength(String text) {
        if (text == null) {
            return 0;
        }
        return text.length();
    }

    public static void main(String[] args) {
        System.out.println(safeLength("java"));
        System.out.println(safeLength(null));
    }
}
:::
:::out
4
0
:::

:::mem The parameter holds null
stack
  frame main
  frame safeLength
  *text -> null
caption: There is no object to reach. Any text.length() here would throw NullPointerException.
:::

### Defensive copies

If a method must not damage the caller's data, copy it first and work on the copy.

:::code
public class Main {
    static int[] sortedCopy(int[] data) {
        int[] copy = Arrays.copyOf(data, data.length);
        Arrays.sort(copy);
        return copy;
    }

    public static void main(String[] args) {
        int[] scores = {30, 10, 20};
        int[] sorted = sortedCopy(scores);
        System.out.println(Arrays.toString(scores));
        System.out.println(Arrays.toString(sorted));
    }
}
:::
:::out
[30, 10, 20]
[10, 20, 30]
:::

:::mem After sortedCopy returns
stack
  frame main
  scores -> #1
  *sorted -> #2
heap
  #1 int[] : 30 | 10 | 20
  *#2 int[] : 10 | 20 | 30
caption: Two separate arrays. The method sorted the copy, so scores is unchanged.
:::

:::trap
"Objects are passed by reference" is wrong, and it makes the reassignment case look like a bug. The reference is passed **by value**. Changing the object through it is shared; pointing the parameter somewhere else is private to the method.
:::

:::q
Q: What does this print?
```java
public class Main {
    static void fill(int[] data) {
        data[0] = 9;
        data = new int[] {7, 7};
        data[1] = 8;
    }

    public static void main(String[] args) {
        int[] data = {1, 2};
        fill(data);
        System.out.println(Arrays.toString(data));
    }
}
```
A: 
```out
[9, 2]
```
E: `data[0] = 9` goes through the shared reference, so the caller's array changes. After `data = new int[] {7, 7}` the parameter points to a new array, so `data[1] = 8` changes only that array.
:::

:::q
Q: What does this print?
```java
public class Main {
    static void rename(String name) {
        name = name + " Singh";
    }

    public static void main(String[] args) {
        String name = "Ravi";
        rename(name);
        System.out.println(name);
    }
}
```
A: 
```out
Ravi
```
E: `name + " Singh"` builds a new String and stores its reference in the parameter only. Strings cannot be changed in place, and the caller's reference was never touched.
:::

:::q
Q: True or false: "When a method receives an object, it receives the object itself, not a copy."
A: False.
E: It receives a copy of the reference. The object is not copied, which is why changes to the object are shared. The reference is copied, which is why reassignment is not shared.
:::

## The swap that does not swap {#t2-swap}

Swapping two values is the standard test of whether you understand pass-by-value. The obvious method does not work.

:::code
public class Main {
    static void swap(int a, int b) {
        int temp = a;
        a = b;
        b = temp;
        System.out.println("inside: a=" + a + " b=" + b);
    }

    public static void main(String[] args) {
        int x = 1;
        int y = 2;
        swap(x, y);
        System.out.println("after: x=" + x + " y=" + y);
    }
}
:::
:::out
inside: a=2 b=1
after: x=1 y=2
:::

:::mem Inside swap, before the three assignments
stack
  frame main
  x = 1
  y = 2
  frame swap
  *a = 1
  *b = 2
caption: a and b are copies of x and y.
:::

:::mem Inside swap, after the three assignments
stack
  frame main
  x = 1
  y = 2
  frame swap
  *a = 2
  *b = 1
  temp = 1
caption: The copies are swapped. x and y are in another frame and never change.
:::

The same thing happens with references. Swapping two reference parameters swaps only the local arrows.

:::code
class Account {
    String owner;

    Account(String owner) {
        this.owner = owner;
    }
}

public class Main {
    static void swap(Account p, Account q) {
        Account temp = p;
        p = q;
        q = temp;
    }

    public static void main(String[] args) {
        Account first = new Account("Ana");
        Account second = new Account("Ben");
        swap(first, second);
        System.out.println(first.owner + " " + second.owner);
    }
}
:::
:::out
Ana Ben
:::

### Fix 1: swap inside an array by index

Pass the array and two indexes. The method changes the elements of the shared array, which the caller sees. This is how sorting algorithms swap.

:::code
public class Main {
    static void swap(int[] arr, int i, int j) {
        int temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }

    public static void main(String[] args) {
        int[] marks = {40, 90, 65};
        swap(marks, 0, 2);
        System.out.println(Arrays.toString(marks));
    }
}
:::
:::out
[65, 90, 40]
:::

:::mem Fix 1: the swap writes into the shared array
stack
  frame main
  marks -> #1
  frame swap
  arr -> #1
  i = 0
  j = 2
  temp = 40
heap
  *#1 int[] : 65 | 90 | 40
caption: arr and marks are two arrows to one array, so the swapped elements are visible to main.
:::

### Fix 2: put the values in an object

Wrap the two values in a small class. The method swaps the fields of the shared object.

:::code
class Pair {
    int first;
    int second;

    Pair(int first, int second) {
        this.first = first;
        this.second = second;
    }
}

public class Main {
    static void swap(Pair p) {
        int temp = p.first;
        p.first = p.second;
        p.second = temp;
    }

    public static void main(String[] args) {
        Pair pair = new Pair(1, 2);
        swap(pair);
        System.out.println(pair.first + " " + pair.second);
    }
}
:::
:::out
2 1
:::

### Fix 3: return a new pair

Often the cleanest solution is a method that does not modify anything. It returns a new value, and the caller decides what to do with it. A `record` is a compact class for such a value pair ([[t2-returns|returning several values]]).

:::code
record Pair(int first, int second) {}

public class Main {
    static Pair swapped(Pair p) {
        return new Pair(p.second(), p.first());
    }

    public static void main(String[] args) {
        Pair pair = new Pair(1, 2);
        Pair result = swapped(pair);
        System.out.println(pair);
        System.out.println(result);
    }
}
:::
:::out
Pair[first=1, second=2]
Pair[first=2, second=1]
:::

:::note
Two local variables in one method need no helper: `int t = x; x = y; y = t;` written directly in the caller works, because the caller owns both variables. A swap **method** only helps when the values live in shared data such as an array or an object.
:::

:::q
Q: Will this compile and what does it print?
```java
public class Main {
    static void swap(String a, String b) {
        String t = a;
        a = b;
        b = t;
    }

    public static void main(String[] args) {
        String x = "left";
        String y = "right";
        swap(x, y);
        System.out.println(x + " " + y);
    }
}
```
A: 
```out
left right
```
E: It compiles and does nothing visible. a and b are copies of the references; swapping the copies does not touch x and y.
:::

:::q
Q: Why does `swap(int[] arr, int i, int j)` work when `swap(int a, int b)` does not?
A: The array method changes elements of an object that the caller also references.
E: The parameter `arr` is a copy of the reference, but it points to the same array. Writing `arr[i]` and `arr[j]` changes that shared array. The int version has nothing shared to write to.
:::

## Overloading {#t2-overloading}

**Overloading** means several methods in one class share a name but have different parameter lists. The compiler picks the right one at compile time from the argument types. Without overloading you would invent `printInt`, `printDouble`, `printString` for what is one idea: print.

The parameter lists must differ in **number**, **types** or **order of types**. The return type and the parameter names do not count, because they are not part of the [[t2-anatomy|signature]].

:::code
public class Main {
    static int add(int a, int b) {
        return a + b;
    }

    static double add(double a, double b) {
        return a + b;
    }

    static int add(int a, int b, int c) {
        return a + b + c;
    }

    public static void main(String[] args) {
        System.out.println(add(2, 3));
        System.out.println(add(2.5, 3));
        System.out.println(add(1, 2, 3));
    }
}
:::
:::out
5
5.5
6
:::

In `add(2.5, 3)` only the `double` version fits: `2.5` cannot become an `int`, but `3` widens to `double`.

Order of types counts. These two are different methods.

:::code
public class Main {
    static String describe(String name, int marks) {
        return name + " scored " + marks;
    }

    static String describe(int marks, String name) {
        return marks + " belongs to " + name;
    }

    public static void main(String[] args) {
        System.out.println(describe("Ana", 90));
        System.out.println(describe(90, "Ana"));
    }
}
:::
:::out
Ana scored 90
90 belongs to Ana
:::

### What does not make an overload

Changing only the return type is not enough. The compiler decides from the call, and a call does not say what return type you want.

:::code fail
public class Main {
    static int parse(String s) {
        return Integer.parseInt(s);
    }

    static double parse(String s) {
        return Double.parseDouble(s);
    }

    public static void main(String[] args) {
        System.out.println(parse("5"));
    }
}
:::
:::out
method parse(String) is already defined in class Main
:::

The same is true for parameter names and for `final`: `add(int a, int b)` and `add(int x, int y)` are the same signature.

### Overloads you already use

`System.out.println` is overloaded. There is a version for `int`, `char`, `double`, `boolean`, `String`, `char[]` and `Object`. That is why `println('a')` prints a letter and `println(97)` prints a number.

:::code
public class Main {
    public static void main(String[] args) {
        System.out.println('a');
        System.out.println(97);
        System.out.println((char) 97);
        System.out.println('a' + 1);
    }
}
:::
:::out
a
97
a
98
:::

The last line surprises people: `'a' + 1` is an `int` ([[t1-promotion|numeric promotion]]), so the `int` version of `println` is chosen.

:::note
Overloading is decided by the **compile-time types** of the arguments, not by the objects they refer to at run time. [[t2-resolution|The next subtopic]] shows the exact order the compiler follows.
:::

:::q
Q: Do these two methods form a valid overload pair?
```java
public class Main {
    static void show(int count) { }
    static void show(int total) { }

    public static void main(String[] args) { }
}
```
A: No, the class does not compile.
```err
method show(int) is already defined in class Main
```
E: Parameter names are not part of the signature. The wrong belief is that different names make different methods.
:::

:::q
Q: What does this print?
```java
public class Main {
    static String kind(int n) { return "int"; }
    static String kind(double n) { return "double"; }

    public static void main(String[] args) {
        System.out.println(kind(5));
        System.out.println(kind(5.0));
        System.out.println(kind('5'));
    }
}
```
A: 
```out
int
double
int
```
E: `'5'` is a `char`. There is no `char` version, and `char` widens to `int` before it widens to `double`, so the `int` method is the closest fit.
:::

## Overload resolution {#t2-resolution}

When several overloads could accept a call, the compiler runs a fixed procedure at compile time. It tries the phases in order and stops at the first phase that finds at least one applicable method.

| Phase | What is allowed | Example: `m(5)` with `m(long)` |
|---|---|---|
| 1. Exact | Same type, plus widening of primitives and references | `int` widens to `long`: found here |
| 2. Boxing | Boxing or unboxing, then widening | `int` to `Integer` |
| 3. Varargs | Variable-arity methods | `m(int...)` |

Within a phase, if more than one method applies, the compiler picks the **most specific** one: the one whose parameter types can be passed to all the others. Phase 1 is called "strict" in the language rules and means "no boxing"; widening is allowed in it.

:::svg Order the compiler tries
<svg viewBox="0 0 360 150">
  <rect class="dg-hl" x="8" y="30" width="100" height="50" rx="6"/>
  <text class="dg-text" x="58" y="52" text-anchor="middle">1. exact /</text>
  <text class="dg-text" x="58" y="68" text-anchor="middle">widening</text>
  <rect class="dg-box" x="130" y="30" width="100" height="50" rx="6"/>
  <text class="dg-text" x="180" y="60" text-anchor="middle">2. boxing</text>
  <rect class="dg-box" x="252" y="30" width="100" height="50" rx="6"/>
  <text class="dg-text" x="302" y="60" text-anchor="middle">3. varargs</text>
  <line class="dg-arrow" x1="108" y1="55" x2="128" y2="55" marker-end="url(#ah)"/>
  <line class="dg-arrow" x1="230" y1="55" x2="250" y2="55" marker-end="url(#ah)"/>
  <text class="dg-label" x="180" y="110" text-anchor="middle">first phase with a match wins</text>
  <text class="dg-label" x="180" y="130" text-anchor="middle">none matches: compile error</text>
</svg>
:::

### Widening beats boxing

An `int` argument prefers a `long` parameter (widening) over an `Integer` parameter (boxing), even though `Integer` looks like the same thing.

:::code
public class Main {
    static void show(long n) { System.out.println("long"); }
    static void show(Integer n) { System.out.println("Integer"); }
    static void show(Object n) { System.out.println("Object"); }

    public static void main(String[] args) {
        show(5);
        show(Integer.valueOf(5));
        show("text");
    }
}
:::
:::out
long
Integer
Object
:::

For `show(5)` phase 1 finds `show(long)` and stops. The boxing phase is never reached. `show(Integer.valueOf(5))` matches `show(Integer)` exactly, and also `show(Object)` by widening of references; the most specific is `Integer`.

### Boxing beats varargs

:::code
public class Main {
    static void show(int... values) { System.out.println("varargs"); }
    static void show(Object o) { System.out.println("Object"); }

    public static void main(String[] args) {
        show(5);
        show();
        show(1, 2);
    }
}
:::
:::out
Object
varargs
varargs
:::

`show(5)`: phase 1 finds nothing (`int` does not widen to `Object`). Phase 2 boxes `5` to `Integer`, which is an `Object`, so `show(Object)` wins before varargs is considered. See [[t2-varargs|varargs]] for the rules.

### Most specific wins

:::code
public class Main {
    static void print(Object o) { System.out.println("Object"); }
    static void print(String s) { System.out.println("String"); }

    public static void main(String[] args) {
        print("hi");
        print(42);
        Object text = "hi";
        print(text);
    }
}
:::
:::out
String
Object
Object
:::

The last call prints `Object` although `text` holds a String. The compiler only knows the declared type of `text`, which is `Object`. This is why overloading is called **static** (compile-time) dispatch.

### Ambiguity: the compiler gives up

If two methods apply in the same phase and neither is more specific, the call is ambiguous and does not compile.

:::code fail
public class Main {
    static void show(int a, double b) { System.out.println("int,double"); }
    static void show(double a, int b) { System.out.println("double,int"); }

    public static void main(String[] args) {
        show(1, 2);
    }
}
:::
:::out
reference to show is ambiguous
:::

Both methods accept `(1, 2)` by widening. Neither is better in both positions. Fix it with a cast, `show(1, 2.0)`, or by adding `show(int, int)`.

### The null argument

`null` fits every reference type. With `String` and `Object` overloads the compiler picks the most specific, `String`. With two unrelated types it cannot choose.

:::code
public class Main {
    static void find(Object o) { System.out.println("Object"); }
    static void find(String s) { System.out.println("String"); }

    public static void main(String[] args) {
        find(null);
    }
}
:::
:::out
String
:::

:::code fail
public class Main {
    static void find(StringBuilder sb) { System.out.println("StringBuilder"); }
    static void find(String s) { System.out.println("String"); }

    public static void main(String[] args) {
        find(null);
    }
}
:::
:::out
reference to find is ambiguous
:::

`String` and `StringBuilder` are unrelated, so neither is more specific. Cast the null: `find((String) null)`.

:::trap
Overloading looks like it should follow the object at run time, but it follows the **declared type** at compile time. `print(text)` with `Object text = "hi"` calls the `Object` version. Choosing by the real object type is a different feature, overriding, which belongs to classes and is not covered in this topic.
:::

:::interview
Which is chosen for `m(5)` when `m(long)`, `m(Integer)` and `m(int...)` exist? `m(long)`: widening is tried before boxing, and boxing before varargs.
:::

:::q
Q: What does this print?
```java
public class Main {
    static void go(double d) { System.out.println("double"); }
    static void go(Integer i) { System.out.println("Integer"); }

    public static void main(String[] args) {
        go(7);
    }
}
```
A: 
```out
double
```
E: Widening `int` to `double` is phase 1. Boxing to `Integer` is phase 2 and is never reached.
:::

:::q
Q: Will this compile?
```java
public class Main {
    static void f(long a, int b) { }
    static void f(int a, long b) { }

    public static void main(String[] args) {
        f(1, 2);
    }
}
```
A: No, the call `f(1, 2)` is ambiguous.
```err
reference to f is ambiguous
```
E: Each method needs one widening and neither is more specific. Calling `f(1L, 2)` would be fine.
:::

:::q
Q: What is chosen for `show('A')` with `show(int)` and `show(String)`?
A: `show(int)`.
E: A `char` widens to `int`. A `char` is not a String, so `show(String)` does not apply.
:::

## Varargs {#t2-varargs}

A **varargs** parameter accepts zero or more arguments of one type. You write `type... name`. Inside the method it is an ordinary array. Without it you would write an overload for each count or force callers to build an array.

:::code
public class Main {
    static int sum(int... numbers) {
        int total = 0;
        for (int n : numbers) {
            total += n;
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(sum());
        System.out.println(sum(5));
        System.out.println(sum(1, 2, 3, 4));
    }
}
:::
:::out
0
5
10
:::

The compiler turns each call into an array creation. `sum(1, 2, 3, 4)` becomes `sum(new int[] {1, 2, 3, 4})` and `sum()` becomes `sum(new int[0])`. The array is never `null` in those cases.

:::mem Inside sum(1, 2, 3, 4), before the loop
stack
  frame main
  frame sum
  *numbers -> #1
  total = 0
heap
  *#1 int[] : 1 | 2 | 3 | 4
caption: The compiler built the array at the call. numbers is an ordinary int[] parameter.
:::

### Rules

1. The varargs parameter must be the **last** one.
2. There can be only **one** varargs parameter.
3. Fixed parameters come before it and are required.

:::code
public class Main {
    static String join(String sep, String... parts) {
        String result = "";
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) {
                result += sep;
            }
            result += parts[i];
        }
        return result;
    }

    public static void main(String[] args) {
        System.out.println(join("-", "a", "b", "c"));
        System.out.println(join("-"));
        System.out.println(join("-", new String[] {"x", "y"}));
    }
}
:::
:::out
a-b-c

x-y
:::

The third call passes an array directly. That is allowed: an array of the right type is accepted as the whole varargs argument.

:::code fail
public class Main {
    static void bad(String... parts, int count) {
    }

    public static void main(String[] args) {
        bad("a", 1);
    }
}
:::
:::out
varargs parameter must be the last parameter
:::

### Varargs and overloading

Varargs is the **last** phase, so a fixed-arity method always wins when it fits.

:::code
public class Main {
    static void log(String msg) { System.out.println("one: " + msg); }
    static void log(String... msgs) { System.out.println("many: " + msgs.length); }

    public static void main(String[] args) {
        log("a");
        log("a", "b");
        log();
    }
}
:::
:::out
one: a
many: 2
many: 0
:::

### Passing null to varargs

`null` can be passed as the whole array. The method then receives a `null` array, and `.length` throws.

:::code
public class Main {
    static int count(String... items) {
        if (items == null) {
            return -1;
        }
        return items.length;
    }

    public static void main(String[] args) {
        System.out.println(count("a", "b"));
        System.out.println(count((String[]) null));
        System.out.println(count((String) null));
    }
}
:::
:::out
2
-1
1
:::

The cast decides what `null` means: `(String[]) null` is a null array, `(String) null` is one element that is null.

:::trap
An `int[]` is accepted by `int...` as the array itself, but it does not fit `Integer...`, because `int[]` is not `Integer[]`, and the call fails to compile. Match the element type exactly.
:::

:::q
Q: What does this print?
```java
public class Main {
    static void show(int a, int... rest) {
        System.out.println(a + " " + rest.length);
    }

    public static void main(String[] args) {
        show(1);
        show(1, 2, 3);
    }
}
```
A: 
```out
1 0
1 2
```
E: The first argument fills `a`. Everything after it forms the array `rest`, which is empty when there are no extras.
:::

:::q
Q: Which is called for `f(3)`: `f(int... a)` or `f(long a)`?
A: `f(long)`.
E: Widening in phase 1 beats varargs in phase 3.
:::

## Returning values {#t2-returns}

A method returns **one** value, or nothing. The returned value is copied out to the caller just as arguments are copied in. For a reference type, the copy is the reference. This is the basis of every method that builds something.

:::code
public class Main {
    static int[] range(int from, int to) {
        int[] result = new int[to - from];
        for (int i = 0; i < result.length; i++) {
            result[i] = from + i;
        }
        return result;
    }

    public static void main(String[] args) {
        int[] r = range(3, 7);
        System.out.println(Arrays.toString(r));
    }
}
:::
:::out
[3, 4, 5, 6]
:::

The array was created inside `range`. It lives on the heap, so it survives when the frame is gone. Only the reference is copied to `r`.

:::mem After range returns
stack
  frame main
  *r -> #1
heap
  *#1 int[] : 3 | 4 | 5 | 6
caption: The frame of range is gone. The array is alive because r points to it.
:::

### Several values: array or record

Java has no tuples. To return two related values, use an array if they have the same type and meaning, or a `record` if they differ.

:::code
record Stats(int min, int max) {}

public class Main {
    static Stats minMax(int[] data) {
        int min = data[0];
        int max = data[0];
        for (int v : data) {
            if (v < min) min = v;
            if (v > max) max = v;
        }
        return new Stats(min, max);
    }

    public static void main(String[] args) {
        Stats s = minMax(new int[] {4, 9, 2, 7});
        System.out.println(s);
        System.out.println(s.max() - s.min());
    }
}
:::
:::out
Stats[min=2, max=9]
7
:::

A record gives names to the parts (`min`, `max`), so the caller cannot mix up the order the way it can with `int[2]`.

### Never return a local's address

In some languages returning a pointer to a local is a bug. In Java it is safe, because objects live on the heap and a returned reference keeps its object alive. What is not safe is returning an internal array that the caller can then change.

:::code
public class Main {
    static int[] secret = {1, 2, 3};

    static int[] leak() {
        return secret;
    }

    static int[] safe() {
        return Arrays.copyOf(secret, secret.length);
    }

    public static void main(String[] args) {
        leak()[0] = 99;
        safe()[1] = 99;
        System.out.println(Arrays.toString(secret));
    }
}
:::
:::out
[99, 2, 3]
:::

### Avoid returning null

A `null` return forces every caller to remember a check. Prefer a value that is safe to use: an empty array, an empty string, or `-1`/`0` with a clear rule.

:::code
public class Main {
    static int[] evens(int[] data) {
        int count = 0;
        for (int v : data) {
            if (v % 2 == 0) count++;
        }
        int[] result = new int[count];
        int k = 0;
        for (int v : data) {
            if (v % 2 == 0) result[k++] = v;
        }
        return result;
    }

    public static void main(String[] args) {
        System.out.println(evens(new int[] {1, 3}).length);
        for (int v : evens(new int[] {1, 2, 3, 4})) {
            System.out.println(v);
        }
    }
}
:::
:::out
0
2
4
:::

An empty array works in a loop and has `.length` 0, so the caller needs no `if`. A `null` would crash both.

### Return type and the returned expression

The returned value must fit the return type. It is converted by the same rules as an assignment, so widening is automatic and narrowing needs a cast.

:::code
public class Main {
    static double half(int n) {
        return n / 2;
    }

    static double halfExact(int n) {
        return n / 2.0;
    }

    public static void main(String[] args) {
        System.out.println(half(5));
        System.out.println(halfExact(5));
    }
}
:::
:::out
2.0
2.5
:::

`n / 2` is integer division and gives `2`. It is widened to `2.0` only when returned, after the damage is done ([[t1-precision|precision]]).

:::q
Q: What does this print?
```java
public class Main {
    static int[] make() {
        return new int[] {1, 2};
    }

    public static void main(String[] args) {
        int[] a = make();
        int[] b = make();
        System.out.println(a == b);
        System.out.println(a.length == b.length);
    }
}
```
A: 
```out
false
true
```
E: Each call creates a new array, so `a` and `b` are different objects. Their lengths are equal.
:::

:::q
Q: Why is an empty array a better "nothing found" result than `null`?
A: The caller can loop over it and read `.length` without a check.
E: `null` makes every caller guard against `NullPointerException`; an empty array is a valid value.
:::

## The call stack {#t2-call-stack}

The JVM keeps a **call stack**: a pile of **frames**, one per active method call. A frame holds that call's parameters, its local variables and the place to continue when it ends. A call pushes a new frame on top. A `return` pops it. Only the top frame runs; the frames below wait.

This is why every call gets its own copy of `n` ([[t2-pass-by-value|pass-by-value]]), and why locals disappear when a method returns.

:::code
public class Main {
    static void third() {
        System.out.println("third");
    }

    static void second() {
        System.out.println("second start");
        third();
        System.out.println("second end");
    }

    static void first() {
        System.out.println("first start");
        second();
        System.out.println("first end");
    }

    public static void main(String[] args) {
        first();
    }
}
:::
:::out
first start
second start
third
second end
first end
:::

The last method called is the first to finish. That is "last in, first out", the behaviour of a stack.

:::mem The stack while third is running
stack
  frame main
  frame first
  frame second
  *frame third
caption: Four frames. main is at the bottom and waits for first, which waits for second, which waits for third.
:::

### Recursion on the stack

A method may call itself. Every call is a new frame with its own parameters. Here is `fact(3)`, which computes `3 * 2 * 1`.

:::code
public class Main {
    static int fact(int n) {
        if (n == 0) return 1;
        return n * fact(n - 1);
    }

    public static void main(String[] args) {
        System.out.println(fact(3));
    }
}
:::
:::out
6
:::
:::dry fact(3): frames pile up, then answers flow back
8 | | main calls fact(3)
2 | n=3 | frame 1 starts with n = 3
4 | | 3 * fact(2): frame 1 must wait for the inner call
2 | n=2 | frame 2 starts with n = 2
4 | | 2 * fact(1): frame 2 waits
2 | n=1 | frame 3 starts with n = 1
4 | | 1 * fact(0): frame 3 waits
2 | n=0 | frame 4 starts with n = 0
3 | | n is 0, the base case: frame 4 returns 1 at once
4 | n=1 | frame 3 resumes with its own n = 1 and returns 1 * 1 = 1
4 | n=2 | frame 2 resumes and returns 2 * 1 = 2
4 | n=3 | frame 1 resumes and returns 3 * 2 = 6
8 | | main prints the result | 6
:::

:::mem fact(3) at its deepest point
stack
  frame main
  frame fact
  n = 3
  frame fact
  n = 2
  frame fact
  n = 1
  frame fact
  *n = 0
caption: Four frames, four separate n. Only the top one runs. The base case returns and the others are popped one by one.
:::

### The stack is finite: StackOverflowError

Each frame uses memory and the stack has a fixed size. If recursion never stops, the frames pile up until the JVM throws `StackOverflowError`. It is an `Error`, not a normal bug report you should handle; here we catch it only to show it.

:::code
public class Main {
    static int forever(int n) {
        return forever(n + 1);
    }

    public static void main(String[] args) {
        try {
            forever(0);
        } catch (StackOverflowError e) {
            System.out.println("stack is full");
        }
        System.out.println("program continues");
    }
}
:::
:::out
stack is full
program continues
:::

How deep the stack gets before overflow depends on the JVM settings and the frame size, so never write code that relies on it, and never print the depth.

:::trap
A recursive method with no base case, or one whose argument moves away from the base case, ends in `StackOverflowError`. Before you run a recursive method, find the base case and ask: does every call get closer to it?
:::

:::q
Q: Which frame runs when `second` calls `third` and `third` is running?
A: Only the `third` frame, the top of the stack.
E: The frames of `main`, `first` and `second` are still on the stack but they wait. Control returns to `second` only after `third` ends.
:::

:::q
Q: True or false: two recursive calls of the same method share the same parameter variable.
A: False.
E: Each call gets its own frame and its own copy of the parameters. That is why `fact` can hold `n = 3`, `n = 2` and `n = 1` at the same time.
:::

## Recursion and the base case {#t2-recursion}

A recursive method solves a problem by solving a smaller version of it. It needs two parts: a **base case** that returns a result without recursing, and a **recursive case** that calls itself with a smaller input and uses the answer. Remove the base case and you have the overflow above.

:::code
public class Main {
    static int sumTo(int n) {
        if (n <= 0) {
            return 0;
        }
        return n + sumTo(n - 1);
    }

    public static void main(String[] args) {
        System.out.println(sumTo(4));
        System.out.println(sumTo(0));
        System.out.println(sumTo(-3));
    }
}
:::
:::out
10
0
0
:::

Note `n <= 0` instead of `n == 0`. With `==`, a call such as `sumTo(-3)` would walk away from zero forever. Use the weakest condition that is still correct.

### Work before and after the call

Where the print sits decides the order of output.

:::code
public class Main {
    static void countDown(int n) {
        if (n == 0) {
            System.out.println("go");
            return;
        }
        System.out.println(n);
        countDown(n - 1);
    }

    static void countUp(int n) {
        if (n == 0) {
            return;
        }
        countUp(n - 1);
        System.out.println(n);
    }

    public static void main(String[] args) {
        countDown(3);
        countUp(3);
    }
}
:::
:::out
3
2
1
go
1
2
3
:::

`countDown` prints on the way in, before the recursive call. `countUp` prints on the way out, after the inner call returns, so the deepest frame prints first.

:::dry countUp(2): printing on the way out
static void countUp(int n) {
    if (n == 0) {
        return;
    }
    countUp(n - 1);
    System.out.println(n);
}
---
2 | n=2 | frame 1 starts with n = 2, not the base case
5 | | frame 1 calls countUp(1) and waits
2 | n=1 | frame 2 starts with n = 1
5 | | frame 2 calls countUp(0) and waits
2 | n=0 | frame 3 starts with n = 0
3 | | base case: frame 3 returns, nothing is printed
6 | n=1 | frame 2 resumes and prints its own n | 1
7 | | frame 2 ends
6 | n=2 | frame 1 resumes and prints its own n | 2
:::

:::q
Q: What does `countDown(2)` print if the print line is moved after the recursive call (and the base case still prints "go")?
A: `go`, `1`, `2`.
E: The recursive call finishes first, so the base case prints "go" before any frame reaches its own print. Frames then print on the way out, deepest first.
:::

:::q
Q: Why is `n <= 0` safer than `n == 0` as the base case of `sumTo`?
A: It also stops for negative arguments.
E: With `==`, `sumTo(-3)` moves to -4, -5 and never reaches 0, so it ends in `StackOverflowError`.
:::

## Static and instance methods {#t2-static}

A **static** method belongs to the class. You call it with the class name and it needs no object. An **instance** method belongs to an object: it runs on one particular object and can read that object's fields. Every method so far was `static` because `main` is static, and a static method can call other static methods directly. Objects and their methods get full treatment later; this subtopic gives you the one rule you need now.

:::code
class Student {
    String name;

    Student(String name) {
        this.name = name;
    }

    String greet() {
        return "Hi, " + name;
    }

    static String school() {
        return "City High";
    }
}

public class Main {
    public static void main(String[] args) {
        Student s = new Student("Ana");
        System.out.println(s.greet());
        System.out.println(Student.school());
        System.out.println(Math.max(3, 8));
    }
}
:::
:::out
Hi, Ana
City High
8
:::

`greet` needs a `Student` object because it reads `name`. `school` needs none, so it is called as `Student.school()`. `Math.max` is the same kind of call: a static method of the class `Math`.

### Why static code cannot touch instance members

Inside an instance method, the name `name` really means `this.name`: the field of the object the method was called on. A static method runs with no such object. There is no `this`, so there is no field to read.

:::code fail
public class Main {
    int count = 0;

    static void show() {
        System.out.println(count);
    }

    public static void main(String[] args) {
        show();
    }
}
:::
:::out
non-static variable count cannot be referenced from a static context
:::

The same applies to `this` itself and to calling an instance method by its bare name.

:::code fail
public class Main {
    String label() {
        return "x";
    }

    public static void main(String[] args) {
        System.out.println(label());
    }
}
:::
:::out
non-static method label() cannot be referenced from a static context
:::

The rule has one direction. An instance method may call static methods and read static fields. A static method may touch instance members only through an object it holds, such as `s.greet()` above.

:::note
Fix for "non-static ... cannot be referenced from a static context": make the member static if it needs no object, or create an object and call the member through it.
:::

### Static fields: one copy for the class

A static field exists once, however many objects there are. An instance field exists once per object. A static field is the usual way to count objects.

:::code
class Ticket {
    static int issued = 0;
    int number;

    Ticket() {
        issued++;
        number = issued;
    }
}

public class Main {
    public static void main(String[] args) {
        Ticket a = new Ticket();
        Ticket b = new Ticket();
        System.out.println(a.number + " " + b.number);
        System.out.println(Ticket.issued);
    }
}
:::
:::out
1 2
2
:::
:::dry Static counter, instance numbers
2 | issued=0 | the static field is created once, when the class is loaded
13 | | main creates the first Ticket
6 | issued=1 | the constructor bumps the shared counter
7 | a.number=1 | a copies the counter into its own field
14 | | main creates the second Ticket
6 | issued=2 | the same shared counter, now 2
7 | b.number=2 | b has its own field
15 | | each object kept its own number | 1 2
16 | | the class-level counter | 2
:::

:::trap
Java lets you call a static method through an object reference, even a `null` one: `ticket.total()` compiles and runs as `Ticket.total()`. It hides the fact that no object is used. Always write the class name.
:::

:::q
Q: Why does a static method fail to compile when it reads an instance field by its bare name?
A: A static method has no `this`, so no object owns the field.
E: Beginners think the field is "just there" in the class. It exists only inside objects, one copy per object.
:::

:::q
Q: What does this print?
```java
class Counter {
    static int total = 0;
    int mine = 0;

    void hit() {
        total++;
        mine++;
    }
}

public class Main {
    public static void main(String[] args) {
        Counter a = new Counter();
        Counter b = new Counter();
        a.hit();
        a.hit();
        b.hit();
        System.out.println(a.mine + " " + b.mine + " " + Counter.total);
    }
}
```
A:
```out
2 1 3
```
E: `mine` is per object, so `a` has 2 and `b` has 1. `total` is shared, so all three hits land in the same variable.
:::

:::q
Q: True or false: a static method can call an instance method without an object.
A: False.
E: The instance method needs an object to run on. Create one and call the method through it.
:::

## Method design: side effects and pure methods {#t2-design}

A **pure** method gives the same result for the same arguments and changes nothing outside itself. A method with a **side effect** changes something else: an array it was given, a field, the console. Pure methods are easy to test and to trust. Use side effects on purpose, and name the method so the caller can tell (`print...`, `add...`, `sort...`).

:::code
public class Main {
    static int[] withTax(int[] prices) {
        int[] result = new int[prices.length];
        for (int i = 0; i < prices.length; i++) {
            result[i] = prices[i] + prices[i] / 10;
        }
        return result;
    }

    static void addTaxInPlace(int[] prices) {
        for (int i = 0; i < prices.length; i++) {
            prices[i] = prices[i] + prices[i] / 10;
        }
    }

    public static void main(String[] args) {
        int[] p = {100, 250};
        int[] q = withTax(p);
        System.out.println(Arrays.toString(p) + " " + Arrays.toString(q));
        addTaxInPlace(p);
        System.out.println(Arrays.toString(p));
    }
}
:::
:::out
[100, 250] [110, 275]
[110, 275]
:::
:::dry withTax builds a new array
17 | p=[100, 250] | main creates the input array
18 | | main calls withTax(p)
3 | prices=[100, 250];result=[0, 0] | prices is a copy of the reference p; result is a new array
4 | i=0 | loop starts
5 | result=[110, 0] | 100 + 10
4 | i=1 | next pass
5 | result=[110, 275] | 250 + 25
7 | | the reference to the new array is returned
18 | q=[110, 275];~result;~i;~prices | q receives that reference; the locals are gone
19 | | p is untouched, q is the new array | [100, 250] [110, 275]
:::

`withTax` is pure: `p` is unchanged. `addTaxInPlace` returns nothing and edits the caller's array through its copied reference ([[t2-reference-params|reference parameters]]). Neither is wrong. The bug is a method that does one while its name promises the other.

:::q
Q: `static void sortScores(int[] a)` sorts the array it receives. Is it pure?
A: No. It has a side effect on the caller's array.
E: The copied reference points to the caller's array, so every change inside is visible outside.
:::

:::q
Q: What does this print?
```java
public class Main {
    static int next(int n) {
        n++;
        return n;
    }

    public static void main(String[] args) {
        int n = 5;
        next(n);
        System.out.println(n);
    }
}
```
A:
```out
5
```
E: The return value was thrown away and the parameter was a copy. Write `n = next(n);` to use the result.
:::

## Topic test {#t2-test}

:::q tags=t2-swap,t2-pass-by-value
Q: What does this print?
```java
public class Main {
    static void swap(int a, int b) {
        int t = a;
        a = b;
        b = t;
        System.out.println(a + " " + b);
    }

    public static void main(String[] args) {
        int x = 1;
        int y = 2;
        swap(x, y);
        System.out.println(x + " " + y);
    }
}
```
A:
```out
2 1
1 2
```
E: The swap really happens, but on the two copies inside the method. `x` and `y` in `main` are separate variables and keep their values. The wrong belief is that a method can reach the caller's variables.
:::

:::q tags=t2-resolution,t2-varargs,t2-overloading
Q: What does this print?
```java
public class Main {
    static void f(long a) {
        System.out.println("long");
    }

    static void f(Integer a) {
        System.out.println("Integer");
    }

    static void f(int... a) {
        System.out.println("varargs");
    }

    public static void main(String[] args) {
        byte b = 1;
        f(5);
        f(b);
        f(5, 6);
    }
}
```
A:
```out
long
long
varargs
```
E: Phase 1 allows widening but no boxing, so `f(long)` wins for both `5` and the `byte`. `f(Integer)` would need boxing (phase 2). Two arguments fit only the varargs method.
:::

:::q tags=t2-reference-params
Q: What does this print?
```java
public class Main {
    static void reset(int[] a) {
        a = new int[] {9, 9};
        a[0] = 7;
    }

    public static void main(String[] args) {
        int[] data = {1, 2};
        reset(data);
        System.out.println(Arrays.toString(data));
    }
}
```
A:
```out
[1, 2]
```
E: Assigning a new array to `a` only repoints the parameter copy. The element write `a[0] = 7` then goes to the new array. The caller's array is never touched.
:::

:::q tags=t2-pass-by-value,t2-reference-params
Q: What does this print?
```java
public class Main {
    static void change(String s, StringBuilder sb) {
        s = s + "!";
        sb.append("!");
        sb = new StringBuilder("x");
        sb.append("?");
    }

    public static void main(String[] args) {
        String s = "ana";
        StringBuilder sb = new StringBuilder("hi");
        change(s, sb);
        System.out.println(s + " " + sb);
    }
}
```
A:
```out
ana hi!
```
E: A `String` cannot be modified, so `s + "!"` makes a new object that only the parameter holds. The `StringBuilder` is changed through the shared object by `append`, but the later `new` repoints only the local copy.
:::

:::q tags=t2-reference-params,t2-returns
Q: What does this print?
```java
public class Main {
    static int[] grow(int[] a) {
        a[0] = 5;
        a = Arrays.copyOf(a, 3);
        a[1] = 6;
        return a;
    }

    public static void main(String[] args) {
        int[] d = {1, 2};
        int[] e = grow(d);
        System.out.println(Arrays.toString(d) + Arrays.toString(e));
    }
}
```
A:
```out
[5, 2][5, 6, 0]
```
E: The write `a[0] = 5` reaches the caller's array. After `copyOf`, `a` points to a new array, so `a[1] = 6` is invisible to `d`. The returned reference is the new array.
:::

:::q tags=t2-recursion,t2-call-stack
Q: What does this print?
```java
public class Main {
    static void g(int n) {
        if (n == 0) {
            return;
        }
        System.out.print(n);
        g(n - 1);
        System.out.print(n);
    }

    public static void main(String[] args) {
        g(3);
        System.out.println();
    }
}
```
A:
```out
321123
```
E: The first print runs on the way in: 3, 2, 1. At `n == 0` the base case returns, and each waiting frame then runs its second print with its own `n`: 1, 2, 3.
:::

:::q tags=t2-returns,t2-anatomy
Q: Will this compile?
```java
public class Main {
    static int find(int[] a, int target) {
        for (int i = 0; i < a.length; i++) {
            if (a[i] == target) {
                return i;
            }
        }
    }

    public static void main(String[] args) {
        System.out.println(find(new int[] {4, 5}, 5));
    }
}
```
A: No.
```err
missing return statement
```
E: The loop may finish without a match, and then the method reaches its closing brace with no value. Add `return -1;` after the loop.
:::

:::q tags=t2-overloading,t2-anatomy
Q: Will this compile?
```java
public class Main {
    static int val(int n) {
        return n;
    }

    static double val(int n) {
        return n;
    }

    public static void main(String[] args) {
        System.out.println(val(2));
    }
}
```
A: No.
```err
method val(int) is already defined in class Main
```
E: The signature is the name plus parameter types. The return type is not part of it, so both methods have the signature `val(int)`.
:::

:::q tags=t2-pass-by-value,t2-design
Q: The programmer expects this to print 3. Why does it print 0?
```java
public class Main {
    static void inc(int c) {
        c++;
    }

    public static void main(String[] args) {
        int count = 0;
        inc(count);
        inc(count);
        inc(count);
        System.out.println(count);
    }
}
```
A:
```out
0
```
E: `inc` increments its own copy and returns nothing. Fix: make it `static int inc(int c)` and write `count = inc(count);`.
:::

:::q tags=t2-returns,t2-anatomy
Q: This should print 2.5 but prints 2.0. Where is the bug?
```java
public class Main {
    static double avg(int a, int b) {
        return (a + b) / 2;
    }

    public static void main(String[] args) {
        System.out.println(avg(4, 1));
    }
}
```
A:
```out
2.0
```
E: `(a + b) / 2` is integer division and gives 2. The result is widened to `2.0` only at the `return`, after the fraction is lost. Use `/ 2.0`.
:::

:::q tags=t2-static
Q: `helper` loses its `static` modifier. Does this still compile?
```java
public class Main {
    int helper(int n) {
        return n * 2;
    }

    public static void main(String[] args) {
        System.out.println(helper(4));
    }
}
```
A: No, it does not compile.
```err
non-static method helper(int) cannot be referenced from a static context
```
E: `main` is static and has no object, so it cannot call an instance method by its bare name. With `static` kept, the program prints 8.
:::

:::q tags=t2-pass-by-value,t2-reference-params,t2-overloading
Q: Which statement is true?
1. Java passes objects by reference and primitives by value.
2. A method can change which object a caller's variable refers to if the parameter is reassigned.
3. A method that receives an array reference can change the array's elements.
4. Two methods named `f` may differ only in their return type.
A: Statement 3.
E: Every argument is passed by value, and for an array the value is a reference, so element writes are visible to the caller (1 is false). Reassigning the parameter changes only the copy (2 is false). Return type is not part of the signature, so 4 does not compile.
:::
