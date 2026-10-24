"""Script to generate 6 comprehensive, professionally formatted course PDFs using ReportLab.
Each PDF provides accurate undergraduate CS curriculum content with clear section headings,
learning outcomes, core concept explanations, code/SQL examples, misconceptions, worked examples,
and practice tasks.
"""
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether


OUTPUT_DIR = Path("apps/tangled/backend/data/demo_materials")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def build_styles():
    styles = getSampleStyleSheet()
    
    # Custom styles
    styles.add(ParagraphStyle(
        name="DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1e3a8a"),
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#4b5563"),
        spaceAfter=14,
    ))
    styles.add(ParagraphStyle(
        name="SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1e40af"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        name="SubSectionHeading",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1f2937"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    ))
    styles.add(ParagraphStyle(
        name="BodyTextCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#1f2937"),
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="CodeBlock",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#111827"),
        spaceBefore=4,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="CalloutText",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor("#92400e"),
    ))
    styles.add(ParagraphStyle(
        name="Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#6b7280"),
        alignment=1, # Center
    ))
    return styles


def create_callout(text, styles, bg_color="#fef3c7", border_color="#f59e0b"):
    p = Paragraph(text, styles["CalloutText"])
    t = Table([[p]], colWidths=[500])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg_color)),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor(border_color)),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    return t


def create_code_box(code_text, styles):
    clean_lines = []
    for line in code_text.strip().split("\n"):
        escaped = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace(" ", "&nbsp;")
        clean_lines.append(escaped)
    p = Paragraph("<br/>".join(clean_lines), styles["CodeBlock"])
    t = Table([[p]], colWidths=[500])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f3f4f6")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


COURSES_DATA = [
    {
        "filename": "programming_fundamentals_guide.pdf",
        "title": "Programming Fundamentals: Control Flow, Iteration & Scope",
        "course_code": "CS101",
        "outcomes": [
            "Understand sequential, branch, and loop execution in Python.",
            "Master counter increments, termination conditions, and boundary invariants.",
            "Navigate zero-indexed sequence semantics and slice ranges [start:stop].",
            "Diagnose and resolve common indentation scope and block structure errors."
        ],
        "sections": [
            {
                "heading": "1. Iteration Semantics: While Loops vs. For Loops",
                "content": """Iteration allows a program to execute a block of statements repeatedly until a specific condition is no longer satisfied. Python provides two primary looping constructs: while loops and for loops.<br/><br/>
<b>The While Loop:</b> A while loop tests a Boolean condition before each iteration. The loop continues executing as long as that condition evaluates to True. It is ideally suited for state-dependent loops where the total number of iterations cannot be determined in advance (for example, reading user input until a sentinel value is entered, or searching until convergence).<br/><br/>
<b>The For Loop:</b> A for loop iterates over the elements of an iterable sequence (such as a list, tuple, dictionary, or range generator). It automatically manages sequence traversal and terminates when the sequence is exhausted. In Python, for loops are preferred whenever the iteration domain is known or bounded.""",
                "code": """# Demonstrating both iteration paradigms
# While loop with explicit counter and termination invariant:
counter = 0
limit = 5
while counter < limit:
    print(f"While iteration: {counter}")
    counter += 1  # Crucial: update state to prevent infinite loop

# Equivalent for loop with range generator:
for item in range(5):
    print(f"For loop index: {item}")"""
            },
            {
                "heading": "2. Sequence Indexing and Slice Boundaries",
                "content": """Python sequences (strings, lists, tuples) utilize <b>zero-based indexing</b>. The initial element resides at index 0, and the final element of a sequence with length N resides at index N - 1. Accessing index N raises an IndexError.<br/><br/>
<b>Why Zero-Indexing?</b> In low-level computer architecture, an array index represents the offset distance in memory from the base pointer of the array. The first element has an offset of zero memory units (base + 0 * element_size). Furthermore, mathematical interval notation [0, N) neatly ensures that the difference between the upper and lower bounds (N - 0 = N) exactly equals the number of elements in the collection.<br/><br/>
<b>Slice Notation:</b> The slice syntax sequence[start:stop:step] extracts a sub-sequence starting at index start and continuing up to, but <i>not including</i>, index stop. This half-open interval rule allows consecutive slices like list[:k] and list[k:] to partition a list without overlap or missing elements.""",
                "code": """values = ["alpha", "beta", "gamma", "delta"]
# Accessing first and last valid elements:
first_element = values[0]       # "alpha"
last_element = values[len(values) - 1]  # "delta"

# Slicing with half-open intervals:
prefix = values[0:2]            # ["alpha", "beta"]
suffix = values[2:4]            # ["gamma", "delta"]
print("Recombined matches original:", (prefix + suffix) == values)  # True"""
            },
            {
                "heading": "3. Indentation, Lexical Scope & Common Misconceptions",
                "content": """Unlike C-style languages that use curly braces {} to delineate blocks of code, Python relies on whitespace indentation. A block begins when indentation increases and ends when indentation decreases to match an outer enclosing level.<br/><br/>
<b>Misconception 1: Why does my counter remain at 1?</b><br/>
A frequent mistake occurs when the counter update statement (e.g., counter += 1) is placed outside the loop body due to improper indentation, or when the loop's condition re-initializes the variable. When the increment is indented outside the while block, the loop condition tests the unmutated value indefinitely, producing an infinite loop.<br/><br/>
<b>Misconception 2: What causes an IndentationError?</b><br/>
An IndentationError: unexpected indent occurs when a line has more whitespace than expected by the lexical context. An IndentationError: unindent does not match any outer indentation level occurs when closing a block to an intermediate column that does not align with any parent statement. Always configure editors to use 4 consistent spaces per indentation level and never mix tabs and spaces.""",
                "code": """# INCORRECT (Common Bug: Counter remains at 1 or loop hangs)
# counter = 1
# while counter < 5:
#     print(counter)
# counter += 1  # BUG: indented outside the while block!

# CORRECT (Properly scoped increment)
counter = 1
while counter < 5:
    print(f"Current step: {counter}")
    counter += 1  # Correctly inside the while block body"""
            },
            {
                "heading": "4. Worked Example: Filtered Accumulator",
                "content": """Consider the task of traversing a sequence of numbers, summing only the positive even integers, and maintaining an iteration counter for diagnostics. The implementation below illustrates proper state initialization, loop guarding, and scoped accumulation:""",
                "code": """def sum_positive_evens(numbers: list[int]) -> tuple[int, int]:
    total_sum = 0
    items_processed = 0
    idx = 0
    
    while idx < len(numbers):
        val = numbers[idx]
        if val > 0 and val % 2 == 0:
            total_sum += val
            items_processed += 1
        idx += 1  # Guaranteed increment on every iteration
        
    return total_sum, items_processed

sample_data = [-4, 2, 7, 10, -8, 6, 3]
total, count = sum_positive_evens(sample_data)
print(f"Sum: {total}, Count: {count}")  # Sum: 18, Count: 3"""
            },
            {
                "heading": "5. Practice Tasks",
                "content": """<b>Task 1:</b> Write a function find_first_negative(values: list[int]) -> int that uses a while loop with a guard variable to find the index of the first negative number in a list. If no negative number exists, return -1.<br/><br/>
<b>Task 2:</b> Inspect the following code snippet and identify why it enters an infinite loop. Fix the indentation so that the loop terminates properly:
<br/><code>i = 0; total = 0<br/>while i &lt; 10:<br/>&nbsp;&nbsp;&nbsp;&nbsp;total += i<br/>i += 1</code>"""
            }
        ]
    },
    {
        "filename": "object_oriented_programming_guide.pdf",
        "title": "Object-Oriented Programming: Classes, Encapsulation & Polymorphism",
        "course_code": "CS102",
        "outcomes": [
            "Distinguish class definitions from instantiated objects in heap memory.",
            "Master method binding, the self parameter, and instance namespaces.",
            "Apply composition over inheritance to design flexible domain architectures.",
            "Prevent mutable default argument bugs and attribute shadowing in Python."
        ],
        "sections": [
            {
                "heading": "1. Class Blueprints vs. Instantiated Objects",
                "content": """A <b>class</b> is an extensible program-code-template defining the attributes (state) and methods (behavior) that characterize any object instantiated from it. An <b>object</b> (or instance) is a concrete runtime entity allocated in memory with its own distinct state dictionary (__dict__).<br/><br/>
When a class is defined, Python creates a class object that serves as a namespace for functions and class attributes. When an instance is created via ConstructorCall(), Python allocates a new instance and automatically passes it as the first argument to the class's __init__ initializer.""",
                "code": """class BankAccount:
    # Class attribute (shared across all instances of BankAccount)
    bank_routing_number = "021000021"

    def __init__(self, owner: str, initial_balance: float = 0.0):
        # Instance attributes (distinct per object)
        self.owner = owner
        self.balance = initial_balance

acc1 = BankAccount("Alice", 1000.0)
acc2 = BankAccount("Bob", 500.0)
print(acc1.owner, acc1.balance)  # Alice 1000.0
print(acc2.owner, acc2.balance)  # Bob 500.0"""
            },
            {
                "heading": "2. Method Invocation and the 'self' Parameter",
                "content": """In Python, methods defined inside a class require an explicit first parameter, conventionally named <b>self</b>. When an instance method is called using dot-notation, such as obj.deposit(50), Python internally translates this call into:
<br/><code>ClassName.deposit(obj, 50)</code><br/><br/>
<b>Why is self explicit?</b> Python follows the Zen of Python principle: <i>Explicit is better than implicit</i>. Having self clearly visible in the parameter list makes it completely transparent whether an attribute assignment self.x = 10 is modifying an instance variable or creating a local function variable x = 10. Omitting self in a method definition results in a TypeError when called on an instance because Python supplies the instance argument automatically.""",
                "code": """class AccountWithMethods:
    def __init__(self, owner: str):
        self.owner = owner
        self._balance = 0.0

    def deposit(self, amount: float) -> float:
        if amount <= 0:
            raise ValueError("Deposit amount must be strictly positive")
        self._balance += amount
        return self._balance

a = AccountWithMethods("Charlie")
# Python invokes AccountWithMethods.deposit(a, 250.0)
a.deposit(250.0)
print("Balance:", a._balance)  # 250.0"""
            },
            {
                "heading": "3. Composition vs. Inheritance and Mutable Default Traps",
                "content": """<b>Composition over Inheritance:</b> While inheritance models an 'is-a' relationship, deep inheritance hierarchies frequently introduce tight coupling, fragile base classes, and namespace pollution. Composition models a 'has-a' relationship by encapsulating specialized collaborator objects within a container class.<br/><br/>
<b>Misconception: Why are two instances sharing the same list?</b><br/>
In Python, default parameter values in function and method signatures are evaluated <i>once when the function is defined</i>, not each time the function is called. If you assign a mutable default object (such as [] or {}) in __init__, every instance created without an explicit argument will share the <b>exact same heap-allocated list</b>! Modifying the list on one object mutates it for all other objects. Always use None as the default sentinel and initialize a new list inside __init__.""",
                "code": """# DANGEROUS PATTERN (Shared Mutable Default):
# class BadStudent:
#     def __init__(self, name: str, grades: list = []):
#         self.name = name
#         self.grades = grades  # All students share ONE list!

# CORRECT PATTERN (Sentinel default with fresh allocation):
class RobustStudent:
    def __init__(self, name: str, grades: list[float] | None = None):
        self.name = name
        self.grades = [] if grades is None else list(grades)

s1 = RobustStudent("Dana")
s2 = RobustStudent("Eli")
s1.grades.append(95.0)
print("S1 grades:", s1.grades)  # [95.0]
print("S2 grades:", s2.grades)  # [] (Correctly isolated!)"""
            },
            {
                "heading": "4. Worked Example: Course Enrollment Architecture",
                "content": """Here is a clean compositional domain model where a Course manages enrollments without inheriting from a generic roster or student class:""",
                "code": """class StudentRecord:
    def __init__(self, student_id: str, full_name: str):
        self.student_id = student_id
        self.full_name = full_name

class AcademicCourse:
    def __init__(self, code: str, title: str, capacity: int = 35):
        self.code = code
        self.title = title
        self.capacity = capacity
        # Composition: Course HAS-A collection of StudentRecords
        self._enrolled: dict[str, StudentRecord] = {}

    def enroll(self, student: StudentRecord) -> bool:
        if len(self._enrolled) >= self.capacity:
            return False
        self._enrolled[student.student_id] = student
        return True

    @property
    def enrollment_count(self) -> int:
        return len(self._enrolled)"""
            },
            {
                "heading": "5. Practice Tasks",
                "content": """<b>Task 1:</b> Create a CourseSection class that holds an instructor reference and a list of enrolled student IDs. Implement a method has_student(student_id: str) -> bool.<br/><br/>
<b>Task 2:</b> Refactor a proposed Vehicle -> Car -> ElectricCar inheritance chain into a compositional Car model that accepts an Engine interface (ElectricEngine vs CombustionEngine)."""
            }
        ]
    },
    {
        "filename": "data_structures_algorithms_guide.pdf",
        "title": "Data Structures and Algorithms: Linear Structures, Search & Complexity",
        "course_code": "CS201",
        "outcomes": [
            "Analyze time and space complexity using Big-O asymptotic notation.",
            "Implement and verify invariant correctness in Binary Search.",
            "Select appropriate linear Abstract Data Types: Stacks (LIFO) vs Queues (FIFO).",
            "Differentiate Graph Traversal algorithms: Breadth-First Search vs Depth-First Search."
        ],
        "sections": [
            {
                "heading": "1. Asymptotic Complexity and Big-O Notation",
                "content": """Asymptotic analysis quantifies how algorithm resource consumption (execution time or memory) scales as input size N grows toward infinity. We express upper bounds using Big-O notation O(f(n)).<br/><br/>
<b>Common Complexity Classes:</b><br/>
• <b>O(1) Constant:</b> Dictionary/HashMap lookup, stack push/pop, array indexing.<br/>
• <b>O(log n) Logarithmic:</b> Binary search on sorted arrays, balanced binary search tree operations.<br/>
• <b>O(n) Linear:</b> Single-pass linear scan, array resizing, unindexed search.<br/>
• <b>O(n log n) Linearithmic:</b> Optimal comparison sorts (MergeSort, QuickSort average case, TimSort).<br/>
• <b>O(n²) Quadratic:</b> Nested loops over inputs, bubble sort, naive all-pairs comparisons.<br/><br/>
<b>What does O(n log n) mean?</b> In divide-and-conquer algorithms like MergeSort, the input is partitioned into two halves recursively. The depth of the recursion tree is log₂(n) levels. At each level, linear work O(n) is performed to merge sub-arrays. Multiplying the work per level by the tree depth yields total time complexity O(n log n).""",
                "code": """# Comparing O(n) vs O(log n) scaling
# For N = 1,000,000 elements:
# O(n) operations: ~1,000,000 steps
# O(log2 n) operations: ~20 steps (50,000x fewer operations!)"""
            },
            {
                "heading": "2. Binary Search Invariants and Sorted Preconditions",
                "content": """Binary search is an algorithm for finding the position of a target value within a <b>sorted</b> array. At each step, the algorithm compares the target value to the middle element.<br/><br/>
<b>The Core Invariant:</b> If the target is present in array A, it must reside within the closed interval [low, high]. On each step, comparing target with A[mid] allows us to safely discard either the lower half (if A[mid] < target) or the upper half (if A[mid] > target).<br/><br/>
<b>Why must the data be sorted?</b> If elements are unsorted, the condition A[mid] < target provides zero information about which half of the remaining array contains target. Applying binary search to unsorted data produces arbitrary, incorrect results.""",
                "code": """def binary_search(arr: list[int], target: int) -> int:
    low = 0
    high = len(arr) - 1

    while low <= high:
        # Prevent potential integer overflow in languages with fixed-width ints:
        mid = low + (high - low) // 2
        mid_val = arr[mid]

        if mid_val == target:
            return mid  # Found target index
        elif mid_val < target:
            low = mid + 1  # Target is strictly in upper half
        else:
            high = mid - 1  # Target is strictly in lower half

    return -1  # Target does not exist in array"""
            },
            {
                "heading": "3. Stacks (LIFO) vs. Queues (FIFO) and Graph Traversal",
                "content": """<b>Stacks (Last-In, First-Out):</b> The element most recently added is the first one removed. Primary operations are push and pop (both O(1)). Used in function call stacks, parenthesis balancing, undo/redo buffers, and Depth-First Search (DFS).<br/><br/>
<b>Queues (First-In, First-Out):</b> Elements are removed in the exact order they were inserted. Primary operations are enqueue and dequeue. Used in CPU job scheduling, printer queues, and Breadth-First Search (BFS).<br/><br/>
<b>BFS vs. DFS Comparison:</b><br/>
• <b>BFS:</b> Uses a FIFO Queue to visit all nodes at distance d before nodes at distance d + 1. Guaranteed to find the shortest path in unweighted graphs. Memory: O(V) proportional to graph width.<br/>
• <b>DFS:</b> Uses a LIFO Stack (or recursion) to explore as deep as possible along each branch before backtracking. Memory: O(d) proportional to tree depth. Ideal for cycle detection and topological sorting.""",
                "code": """from collections import deque

def bfs_shortest_path(graph: dict[str, list[str]], start: str, target: str) -> list[str] | None:
    queue = deque([[start]])
    visited = {start}

    while queue:
        path = queue.popleft()
        node = path[-1]
        if node == target:
            return path
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(path + [neighbor])
    return None"""
            },
            {
                "heading": "4. Worked Example: Parentheses Balance Checker",
                "content": """Demonstrating a stack application for matching nested delimiters:""",
                "code": """def is_balanced(expression: str) -> bool:
    stack = []
    matching = {")": "(", "}": "{", "]": "["}

    for char in expression:
        if char in "({[":
            stack.append(char)
        elif char in matching:
            if not stack or stack.pop() != matching[char]:
                return False
    return len(stack) == 0

print(is_balanced("{[()]}"))   # True
print(is_balanced("{[(])}"))   # False (Mismatched nesting)"""
            },
            {
                "heading": "5. Practice Tasks",
                "content": """<b>Task 1:</b> Implement binary search to find the <i>first occurrence</i> (leftmost index) of a target element in a sorted list containing duplicate values.<br/><br/>
<b>Task 2:</b> Trace a BFS vs DFS traversal order on a tree with root 1, children 2 and 3, and subchildren (4, 5 under 2) and (6 under 3). Write out the queue and stack states at each step."""
            }
        ]
    },
    {
        "filename": "database_systems_sql_guide.pdf",
        "title": "Database Systems and SQL: Relational Algebra, Joins & Query Optimization",
        "course_code": "CS202",
        "outcomes": [
            "Formulate complex multi-table relational queries using standard ANSI SQL.",
            "Understand three-valued logic, NULL handling, and Outer Join semantics.",
            "Distinguish row filtering (WHERE) from group aggregation filtering (HAVING).",
            "Explain B-Tree index structures and evaluate query execution trade-offs."
        ],
        "sections": [
            {
                "heading": "1. Relational Joins and Outer Join Nullability",
                "content": """Relational databases store data in normalized tables. To combine information across related entities, SQL provides relational join operators.<br/><br/>
<b>INNER JOIN:</b> Returns only rows where there is a match in both the left and right tables based on the join predicate.<br/><br/>
<b>LEFT OUTER JOIN:</b> Returns all rows from the left table, combined with matched rows from the right table. When no corresponding row exists in the right table, all right-table columns are populated with <b>NULL</b>.<br/><br/>
<b>Misconception 1: Why does a LEFT JOIN produce NULL?</b><br/>
NULL signifies the absence of a recorded value or a non-existent relationship. If a student is enrolled in zero courses, a LEFT JOIN between Student and Enrollment produces a row containing the student's ID and name, while the course_id column will be NULL. If you use COUNT(*) on the result, you will erroneously count 1 instead of 0! Always use COUNT(course_id) to count non-null matches.""",
                "code": """-- Correctly counting enrollments per student, including students with zero courses:
SELECT
    s.id,
    s.email,
    COUNT(e.course_id) AS enrolled_courses_count
FROM student s
LEFT JOIN enrollment e ON s.id = e.student_id
GROUP BY s.id, s.email;"""
            },
            {
                "heading": "2. WHERE vs. HAVING: The SQL Logical Execution Pipeline",
                "content": """A fundamental source of query bugs is confusing the role of the WHERE clause with the HAVING clause. SQL queries execute in a strict conceptual order:<br/><br/>
<b>Conceptual Execution Pipeline:</b><br/>
1. <code>FROM / JOIN</code>: Establish the cartesian cross product and evaluate join conditions.<br/>
2. <code>WHERE</code>: Filter individual source rows <i>before</i> any grouping occurs.<br/>
3. <code>GROUP BY</code>: Aggregate surviving rows into summary buckets.<br/>
4. <code>HAVING</code>: Filter the aggregated groups using group conditions (e.g., COUNT(*) > 5).<br/>
5. <code>SELECT</code>: Project requested columns and compute aggregate functions.<br/>
6. <code>ORDER BY</code>: Sort the final output rows.<br/><br/>
<b>Key Rule:</b> Aggregate functions like COUNT(), SUM(), AVG(), MIN(), MAX() <b>cannot appear in a WHERE clause</b> because groups do not yet exist when WHERE is evaluated. They must appear in the HAVING clause.""",
                "code": """-- Finding courses that have more than 20 students enrolled:
-- INCORRECT: SELECT name FROM course WHERE COUNT(student_id) > 20 (Syntax Error!)
-- CORRECT:
SELECT
    c.name,
    COUNT(s.id) AS student_count
FROM course c
JOIN student s ON c.id = s.course_id
WHERE c.joining_open = TRUE        -- Row filter: only open courses
GROUP BY c.id, c.name
HAVING COUNT(s.id) > 20;           -- Group filter: only large cohorts"""
            },
            {
                "heading": "3. Indexing Fundamentals and B-Tree Traversal",
                "content": """Without an index, finding a row matching WHERE student_id = 1042 requires a <b>Full Table Scan</b>: scanning every single data page on disk, yielding O(N) disk I/O cost.<br/><br/>
<b>B-Tree Indexes:</b> Relational database systems organize indexes using balanced search trees (B-Trees). A B-Tree maintains sorted keys in hierarchical nodes. Traversing from root to leaf takes O(log N) operations. For a table with 10,000,000 rows, a B-Tree lookup typically requires only 3 to 4 page reads!<br/><br/>
<b>When should you create an index?</b><br/>
• Primary keys and unique identifiers (indexed automatically).<br/>
• Foreign key columns used in frequent JOIN predicates.<br/>
• Columns frequently filtered in WHERE clauses with high selectivity (returning a small fraction of rows).<br/>
<b>The Trade-off:</b> Every index consumes disk space and incurs write overhead: every INSERT, UPDATE, or DELETE must update both the table heap and all associated B-Trees.""",
                "code": """-- Creating an index on high-frequency join and filter columns:
CREATE INDEX ix_student_course_section ON student(course_id, section_id);

-- Explain plan reveals whether the query uses index seek or table scan:
EXPLAIN QUERY PLAN
SELECT * FROM student WHERE course_id = 4 AND section_id = 2;"""
            },
            {
                "heading": "4. Worked Example: Diagnostic Misconception Query",
                "content": """Aggregating student question frequencies and identifying topics with high confusion rates:""",
                "code": """SELECT
    c.name AS concept_name,
    COUNT(m.id) AS total_questions,
    SUM(CASE WHEN m.intent = 'confusion' THEN 1 ELSE 0 END) AS confusion_count,
    ROUND(CAST(SUM(CASE WHEN m.intent = 'confusion' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(m.id), 2) AS confusion_rate
FROM concept c
JOIN message m ON c.id = m.concept_id
GROUP BY c.id, c.name
HAVING COUNT(m.id) >= 5 AND confusion_rate > 0.40
ORDER BY confusion_rate DESC;"""
            },
            {
                "heading": "5. Practice Tasks",
                "content": """<b>Task 1:</b> Write an SQL query that lists all instructors who currently teach courses with fewer than 15 total enrolled students across all their assigned sections.<br/><br/>
<b>Task 2:</b> Given a table Enrollments(student_id, course_id, grade), explain why a composite index on (course_id, grade) can accelerate a search for <code>WHERE course_id = 101 AND grade = 'A'</code>, but cannot accelerate <code>WHERE grade = 'A'</code> alone."""
            }
        ]
    },
    {
        "filename": "machine_learning_fundamentals_guide.pdf",
        "title": "Machine Learning Fundamentals: Supervised Learning, Validation & Metrics",
        "course_code": "CS301",
        "outcomes": [
            "Evaluate predictive models on imbalanced datasets using appropriate metrics.",
            "Identify and prevent data leakage across train, validation, and test splits.",
            "Construct robust scikit-learn Pipelines with isolated feature preprocessors.",
            "Analyze and tune classification decision thresholds along the Precision-Recall curve."
        ],
        "sections": [
            {
                "heading": "1. Class Imbalance and the Illusion of Accuracy",
                "content": """In many real-world machine learning domains (such as medical diagnosis, financial fraud detection, and drop-out prediction), the positive class is rare. For example, 1% of transactions may be fraudulent while 99% are legitimate.<br/><br/>
<b>The Accuracy Paradox:</b> If a naive dummy classifier always predicts 'Legitimate' (the majority class), it achieves <b>99% classification accuracy</b> while successfully detecting exactly zero fraudulent transactions! Accuracy is therefore a dangerously misleading metric on skewed datasets.<br/><br/>
<b>Appropriate Metrics for Imbalanced Datasets:</b><br/>
• <b>Precision:</b> TP / (TP + FP). Out of all instances predicted positive, what proportion was actually positive? Crucial when false alarms carry high operational costs.<br/>
• <b>Recall (Sensitivity):</b> TP / (TP + FN). Out of all true positive instances, what proportion did the model successfully retrieve? Crucial when missing a positive is catastrophic.<br/>
• <b>F1-Score:</b> The harmonic mean of precision and recall: 2 * (Precision * Recall) / (Precision + Recall).<br/>
• <b>ROC-AUC & PR-AUC:</b> Threshold-independent measures of ranking capability.""",
                "code": """from sklearn.metrics import classification_report, confusion_matrix

y_true = [0] * 99 + [1] * 1      # 99 negatives, 1 positive
y_pred = [0] * 100               # Dummy model predicting all negatives

# Accuracy = 99.0%, but Recall for minority class is 0.0%!
print("Confusion Matrix:\n", confusion_matrix(y_true, y_pred))
# Shows: [[99, 0], [1, 0]]"""
            },
            {
                "heading": "2. Data Leakage and Preprocessing Rigor",
                "content": """<b>Data Leakage</b> occurs when information from outside the training dataset is inadvertently used to create or tune the model. Leakage causes unrealistically optimistic validation metrics during development, followed by failure in production.<br/><br/>
<b>The Golden Rule:</b> All data transformations (feature scaling, imputation of missing values, dimensionality reduction, one-hot encoding) must be learned <b>exclusively on the training partition</b>, and then applied to the validation and test partitions without re-fitting.<br/><br/>
<b>Classic Leakage Scenario:</b> Calling <code>scaler.fit_transform(X)</code> on the entire dataset prior to running train_test_split. When the scaler calculates mean and standard deviation across all rows, information about the test set's distribution leaks into the training features.""",
                "code": """from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

# CORRECT WORKFLOW: Use Pipeline to encapsulate fit semantics
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# The Pipeline ensures scaler.fit() is ONLY called on X_train during cross-validation
pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("classifier", LogisticRegression())
])
pipeline.fit(X_train, y_train)
test_score = pipeline.score(X_test, y_test)"""
            },
            {
                "heading": "3. The Precision-Recall Trade-off & Threshold Tuning",
                "content": """Binary classifiers produce continuous probability estimates P(y = 1 | x). By default, libraries apply a decision threshold of 0.5: if P >= 0.5, predict positive, else negative.<br/><br/>
<b>Varying the Threshold:</b><br/>
• <b>Lowering the threshold (e.g., to 0.2):</b> The model predicts positive more aggressively. Recall increases (fewer false negatives), but precision drops (more false alarms).<br/>
• <b>Raising the threshold (e.g., to 0.8):</b> The model only predicts positive when highly confident. Precision increases, but recall drops.<br/><br/>
The optimal threshold depends strictly on real-world business and clinical costs, never on an arbitrary 0.5 default.""",
                "code": """import numpy as np

# Tuning decision threshold:
probs = pipeline.predict_proba(X_test)[:, 1]
custom_threshold = 0.35  # Prioritizing recall over precision
custom_preds = (probs >= custom_threshold).astype(int)"""
            },
            {
                "heading": "4. Worked Example: Leak-Free Cross-Validation",
                "content": """Evaluating a classifier across stratified k-folds without feature normalization leakage:""",
                "code": """from sklearn.model_selection import StratifiedKFold, cross_val_score

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
# cross_val_score with pipeline guarantees no fold leakage
cv_f1_scores = cross_val_score(pipeline, X_train, y_train, cv=skf, scoring='f1')
print(f"5-Fold Mean F1: {cv_f1_scores.mean():.3f} +/- {cv_f1_scores.std():.3f}")"""
            },
            {
                "heading": "5. Practice Tasks",
                "content": """<b>Task 1:</b> A model trained to detect student dropout achieves 92% precision and 45% recall. Explain to an academic advisor what these numbers mean in plain English.<br/><br/>
<b>Task 2:</b> Review an ML script where missing values in a dataset are imputed with the median of the whole table before splitting. Explain why this constitutes data leakage and how to fix it."""
            }
        ]
    },
    {
        "filename": "ai_llms_rag_guide.pdf",
        "title": "Artificial Intelligence, LLMs, and Retrieval-Augmented Generation",
        "course_code": "CS302",
        "outcomes": [
            "Distinguish Retrieval-Augmented Generation (RAG) architectures from parameter fine-tuning.",
            "Implement dense vector indexing and cosine similarity retrieval across course documents.",
            "Enforce strict multi-tenant course isolation and metadata filtering in vector databases.",
            "Mitigate language model hallucinations using grounded system prompts and citation verification."
        ],
        "sections": [
            {
                "heading": "1. Retrieval-Augmented Generation vs. Model Fine-Tuning",
                "content": """Large Language Models (LLMs) store knowledge in their billions of static neural network weights (parametric memory). However, parametric memory suffers from critical limitations: it cannot be easily updated after training, has no awareness of proprietary institutional documents, and is prone to hallucination.<br/><br/>
<b>Retrieval-Augmented Generation (RAG):</b> RAG combines parametric intelligence with dynamic non-parametric retrieval. When a student asks a question, RAG searches an external vector index of course materials, extracts the most relevant text chunks, and injects them into the LLM's prompt context as verified grounding evidence.<br/><br/>
<b>Comparison Table:</b><br/>
• <b>RAG:</b> Zero retraining cost, immediate document updates, fully citeable source provenance, private course isolation.<br/>
• <b>Fine-Tuning:</b> High computational cost, static knowledge cutoff, unverifiable source provenance, ideal for learning style or specialized syntax rather than factual updates.""",
                "code": """# RAG Prompt Construction Paradigm
system_prompt = \"\"\"You are Renaissance, a university AI learning assistant.
Answer the student's question using ONLY the provided course excerpts.
Every factual statement must cite its source chunk using [1], [2], etc.
If the excerpts do not contain the answer, state that the material lacks sufficient information.\"\"\"

user_prompt = f\"\"\"Context Excerpts:
[1] (Syllabus, p.2): Midterm exam is scheduled for Week 8.
[2] (Grading, p.1): Homework assignments constitute 30% of final grade.

Question: What percentage of my grade is the homework?\"\"\""""
            },
            {
                "heading": "2. Vector Embeddings and Dense Semantic Retrieval",
                "content": """Unlike keyword search (such as BM25), dense retrieval relies on <b>vector embeddings</b>. An embedding model maps textual strings into a continuous high-dimensional vector space (e.g., 768 or 1536 dimensions) where semantic proximity corresponds to vector proximity.<br/><br/>
<b>Cosine Similarity:</b> To find chunks relevant to a query vector q and document chunk vector d, we compute their cosine similarity:
<br/><code>cosine_similarity(q, d) = (q · d) / (||q|| * ||d||)</code><br/><br/>
Cosine similarity ranges from -1.0 to 1.0 (or 0.0 to 1.0 for normalized non-negative embeddings). Chunks scoring above a similarity threshold (such as 0.35) are retrieved, ranked, and appended to the context window.""",
                "code": """import numpy as np

def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return float(dot_product / (norm_v1 * norm_v2))"""
            },
            {
                "heading": "3. Multi-Tenant Course Isolation in Vector Stores",
                "content": """In an academic platform hosting multiple courses and departments, a catastrophic failure mode is <b>cross-course chunk contamination</b>. If an algorithms student asks 'What is on the final exam?', returning a chunk from an introductory programming course syllabus provides incorrect, confusing guidance.<br/><br/>
<b>Metadata Filtering:</b> To guarantee mathematical isolation, every vector inserted into Chroma or Pinecone must carry indexed metadata: {course_id: int, material_id: int}. When querying, the search must apply a strict metadata filter predicate:
<br/><code>where={"$and": [{"course_id": current_course_id}, {"material_id": target_material_id}]}</code><br/><br/>
Under this rule, vectors belonging to other courses are physically excluded from candidate similarity comparisons before nearest neighbors are computed.""",
                "code": """# Safe Chroma Query with Mandatory Course Scoping
def query_course_materials(collection, query_embedding, course_id: int, top_k: int = 4):
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={\"course_id\": course_id}  # STRICT course boundary
    )
    return results"""
            },
            {
                "heading": "4. Mitigating Hallucinations and Unanswerable Queries",
                "content": """An LLM produces a hallucination when it generates fluent, plausible-sounding text that is factually unsupported by its grounding context.<br/><br/>
<b>Defensive Grounding Strategy:</b><br/>
1. <b>Strict Negative Constraints:</b> Explicitly instruct the assistant to decline answering questions when relevant evidence is absent from the excerpts.<br/>
2. <b>Preserve Bracket Citations:</b> Enforce that every claim links back to [n] source tags.<br/>
3. <b>Compaction Integrity:</b> When compacting long conversational history, never truncate or discard the source citation markers [1], [2] from prior assistant responses.""",
                "code": """# Example grounded response format:
# "According to [1], binary search requires a sorted sequence.
# Slicing in Python utilizes half-open intervals [2]." """
            },
            {
                "heading": "5. Practice Tasks",
                "content": """<b>Task 1:</b> Explain why vector search alone cannot guarantee that an LLM will not hallucinate, and describe two architectural safeguards against ungrounded generation.<br/><br/>
<b>Task 2:</b> Write a test case verifying that an embedding query for Course ID 5 never returns vector IDs belonging to Course ID 6, even if the cosine similarity between the query and Course 6 materials is 0.99."""
            }
        ]
    }
]


def generate_pdf(course_data, styles):
    filename = course_data["filename"]
    filepath = OUTPUT_DIR / filename
    doc = SimpleDocTemplate(
        str(filepath),
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54,
    )
    story = []

    # Title & Header
    story.append(Paragraph(course_data["title"], styles["DocTitle"]))
    story.append(Paragraph(f"Academic Course Reference & Study Guide · Department of Computer Science ({course_data['course_code']})", styles["DocSubtitle"]))
    
    # Audit Notice Callout
    notice_text = "<b>Synthetic Educational Content:</b> This course guide was generated for university academic platform demonstration and empirical learning research. All concepts, worked problems, and exercises reflect real undergraduate computing pedagogy."
    story.append(create_callout(notice_text, styles, bg_color="#eff6ff", border_color="#3b82f6"))
    story.append(Spacer(1, 14))

    # Learning Outcomes
    story.append(Paragraph("Course Learning Outcomes", styles["SectionHeading"]))
    for outcome in course_data["outcomes"]:
        p = Paragraph(f"• {outcome}", styles["BodyTextCustom"])
        story.append(p)
    story.append(Spacer(1, 12))

    # Sections
    for sec in course_data["sections"]:
        story.append(Paragraph(sec["heading"], styles["SectionHeading"]))
        story.append(Paragraph(sec["content"], styles["BodyTextCustom"]))
        if "code" in sec:
            story.append(create_code_box(sec["code"], styles))
        story.append(Spacer(1, 10))

    # Footer Disclaimer
    story.append(Spacer(1, 16))
    story.append(Paragraph("Renaissance University Learning Platform · Demonstration Dataset · All Rights Reserved", styles["Disclaimer"]))

    doc.build(story)
    print(f"Generated: {filepath} ({filepath.stat().st_size} bytes)")
    return filepath


def main():
    styles = build_styles()
    for course_data in COURSES_DATA:
        generate_pdf(course_data, styles)
    print(f"Successfully generated all {len(COURSES_DATA)} course PDFs in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
