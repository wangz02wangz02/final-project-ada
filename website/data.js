/* ============================================================
   Content data — vintage computing manual edition.
   Each entry now carries:
     papers : [{ ref, title, authors, venue, year, url, file }]
     math   : [{ label, tex, note, proof: [{ tex, why }, ...] }]
   Detailed proofs are filled in for Batch 1 (symbolic / perceptron / mlp).
   The other chapters keep their concise math from the previous version and
   will be deepened in batches 2-5.
   ============================================================ */

const ERAS = [
  { id: 'rules',     num: 'I',   title: 'Rule-Based Intelligence',
    question: 'Can intelligence be written as rules?' },
  { id: 'represent', num: 'II',  title: 'Learned Representation',
    question: 'Can a model discover useful features on its own?' },
  { id: 'sequence',  num: 'III', title: 'Sequence and Memory',
    question: 'How does a model remember what came before?' },
  { id: 'attention', num: 'IV',  title: 'Attention & Scalable Pretraining',
    question: 'How can a model see all context at once, at scale?' },
  { id: 'modern',    num: 'V',   title: 'The Modern LLM Era',
    question: 'How does prediction become a general-purpose interface?' },
];

const ENTRIES = [
  /* ============================================================
     BATCH 1 — RULE-BASED + EARLY LEARNED REPRESENTATION
     ============================================================ */

  /* ---------- Symbolic AI ---------- */
  {
    id: 'symbolic', era: 'rules',
    year: '1956 – 1980',
    title: 'SYMBOLIC AI & EXPERT SYSTEMS',
    keyIdea: 'Intelligence treated as explicit logic over symbols.',
    instl: 'Carnegie Mellon · Stanford · MIT AI Lab',
    authors: 'Newell, Simon, Shortliffe, Buchanan, Feigenbaum',
    narrative: `
      <p>For nearly two decades after the 1956 Dartmouth Conference, the
      dominant view of artificial intelligence was that thinking was
      <em>logic on symbols</em>. If we could just write down enough
      <em>if–then</em> rules, the reasoning would follow.</p>
      <p>This produced <strong>expert systems</strong>. The most famous —
      <strong>DENDRAL</strong> <span class="cite" data-cite="1">[1]</span>
      inferred molecular structures from mass-spectrometer data; the
      antibiotics-recommending <strong>MYCIN</strong>
      <span class="cite" data-cite="2">[2]</span> reasoned about blood
      infections using ~600 rules with certainty factors.</p>
      <p>The approach hit the <em>knowledge-acquisition bottleneck</em>: the
      real world has too many exceptions to capture by hand. By the late 1980s
      the field had begun the long shift to learning rules from data, rather
      than writing them down.</p>`,
    math: [
      { label: 'A rule with certainty factor',
        tex: '\\text{IF } A_1 \\wedge A_2 \\wedge \\cdots \\wedge A_k \\text{ THEN } C \\text{ (cf} = \\tau \\text{)}',
        note: 'Knowledge is a list of such rules. Inference is forward chaining: fire any rule whose antecedents are believed, until no new conclusions appear.',
        proof: [
          { tex: '\\text{Belief}(C) = \\tau \\cdot \\min\\{\\text{Belief}(A_i)\\}',
            why: 'MYCIN combined evidence using a min over conjuncts, scaled by the rule\'s certainty factor τ ∈ [0,1].' },
          { tex: '\\text{cf}_{\\text{combined}} = \\text{cf}_1 + \\text{cf}_2 (1 - \\text{cf}_1) \\quad \\text{when both} \\ge 0',
            why: 'When two independent rules both support C, their certainty factors combine non-linearly so that no single rule produces certainty.' }
        ]
      },
    ],
    code: { lang: 'python', caption: 'A tiny forward chainer.',
      body:
`rules = [
    ({"fur", "barks"},      "dog"),
    ({"fur", "meows"},      "cat"),
    ({"feathers", "flies"}, "bird"),
    ({"feathers", "swims"}, "duck"),
    ({"scales", "swims"},   "fish"),
]

def infer(facts):
    fired = []
    for ants, concl in rules:
        if ants.issubset(facts):
            fired.append((ants, concl))
    return fired

print(infer({"fur", "barks"}))     # -> [({'fur','barks'}, 'dog')]`,
    },
    papers: [
      { ref: '1', title: 'DENDRAL: A case study of the first expert system for scientific hypothesis formation',
        authors: 'Lindsay, Buchanan, Feigenbaum, Lederberg', venue: 'Artificial Intelligence', year: 1993,
        url: 'https://www.sciencedirect.com/science/article/abs/pii/000437029390003V' },
      { ref: '2', title: 'Computer-Based Medical Consultations: MYCIN',
        authors: 'Shortliffe, E. H.', venue: 'Elsevier (book)', year: 1976,
        url: 'https://archive.org/details/computerbasedmed0000shor' },
      { ref: '3', title: 'Artificial Intelligence: Short History, Present Developments, and Future Outlook',
        authors: 'Brock, D. C. (ed.)', venue: 'MIT Computer Science & AI Laboratory Report', year: 2021,
        url: 'https://dspace.mit.edu/handle/1721.1/130411', file: 'papers/Artificial Intelligence Short History, Present Developments, and Future Outlook - Final Report - 2021-03-16_0.pdf' },
    ],
    interactive: { kind: 'symbolic' },
    compare: { title: 'Strength vs. weakness', rows: [
      ['Symbolic AI', 'Transparent: every decision is a traceable chain of rules.',
       'Brittle: cannot handle exceptions, ambiguity, or concepts not pre-encoded.'],
    ]},
  },

  /* ---------- Perceptron ---------- */
  {
    id: 'perceptron', era: 'represent',
    year: '1957',
    title: 'THE PERCEPTRON',
    keyIdea: 'A machine that learns its weights from data — but only a straight line.',
    instl: 'Cornell Aeronautical Laboratory',
    authors: 'F. Rosenblatt',
    narrative: `
      <p>In 1957, at the Cornell Aeronautical Laboratory, Frank Rosenblatt
      built the <strong>Perceptron</strong>
      <span class="cite" data-cite="1">[1]</span>. It was the first model to
      <em>learn from data</em>: each input wire carried a weight, the unit
      fired when their weighted sum crossed a threshold, and the weights were
      adjusted whenever the machine guessed wrong. The <em>New York Times</em>
      reported the U.S. Navy expected it to "walk, talk, see, write, reproduce
      itself, and be conscious of its existence."</p>
      <p>That, of course, was not what happened. In 1969 Minsky and Papert
      proved a devastating limitation in <em>Perceptrons</em>
      <span class="cite" data-cite="2">[2]</span>: a single perceptron
      <strong>cannot learn XOR</strong>. Any decision boundary that isn't a
      straight line is out of reach. The proof — short enough to do by hand —
      is in §2 below. Funding evaporated; the field entered its first
      "winter."</p>
      <p>What the perceptron did get right is foundational: a <em>learning
      rule</em> with a convergence theorem, the optimistic assumption that
      pattern recognition could be expressed as inner products, and the
      template that every later neural network would extend.</p>`,
    math: [
      { label: 'Decision rule',
        tex: 'f(x) \\;=\\; \\operatorname{sgn}(w^\\top x + b)',
        note: 'A linear classifier — sign of an inner product. Decision boundary is the hyperplane \\(w^\\top x + b = 0\\).',
        proof: [
          { tex: 'w^\\top x + b > 0 \\;\\Longleftrightarrow\\; \\text{predict +1}; \\;\\; w^\\top x + b < 0 \\;\\Longleftrightarrow\\; \\text{predict -1}',
            why: 'The hyperplane partitions \\(\\mathbb R^d\\) into two open half-spaces. \\(\\operatorname{sgn}\\) reads off which side a point is on.' },
          { tex: '\\operatorname{dist}(x, \\text{boundary}) \\;=\\; \\dfrac{|w^\\top x + b|}{\\lVert w \\rVert}',
            why: 'The magnitude of the score, normalised by \\(\\lVert w \\rVert\\), is the geometric margin — useful later for SVMs.' }
        ]
      },
      { label: 'Update rule',
        tex: 'w \\;\\leftarrow\\; w + \\eta\\, y_i \\, x_i \\qquad b \\;\\leftarrow\\; b + \\eta\\, y_i \\quad \\text{(on misclassified examples)}',
        note: 'Push the weights in the direction of the true label whenever the model is wrong. With \\(w_0 = 0\\) the learning rate is irrelevant.',
        proof: [
          { tex: '\\text{misclassified} \\;\\Longleftrightarrow\\; y_i(w^\\top x_i + b) \\le 0',
            why: 'The product of label and score is positive exactly when the prediction is correct.' },
          { tex: 'w_{\\text{new}}^\\top x_i + b_{\\text{new}} \\;=\\; (w + \\eta y_i x_i)^\\top x_i + (b + \\eta y_i) \\;=\\; (w^\\top x_i + b) + \\eta y_i (\\lVert x_i \\rVert^2 + 1)',
            why: 'After one update, the score on the offending example moves by \\(\\eta y_i (\\lVert x_i \\rVert^2 + 1)\\) in the correct direction.' }
        ]
      },
      { label: 'Why XOR is impossible (proof by contradiction)',
        tex: '\\begin{aligned} (0,0)\\!\\mapsto\\!-1 &\\;\\Rightarrow\\; b < 0 \\\\ (1,0)\\!\\mapsto\\!+1 &\\;\\Rightarrow\\; w_1 + b > 0 \\\\ (0,1)\\!\\mapsto\\!+1 &\\;\\Rightarrow\\; w_2 + b > 0 \\\\ (1,1)\\!\\mapsto\\!-1 &\\;\\Rightarrow\\; w_1 + w_2 + b < 0 \\end{aligned}',
        note: 'The four XOR points cannot be linearly separated by any single perceptron.',
        proof: [
          { tex: '\\text{Suppose } \\exists\\; (w_1, w_2, b) \\text{ classifying all four points correctly.}',
            why: 'Start by assuming the opposite of what we want to prove, then derive a contradiction.' },
          { tex: '(1,0)\\!\\mapsto\\!+1 \\Rightarrow w_1 + b > 0 \\;\\;\\text{and}\\;\\; (0,1)\\!\\mapsto\\!+1 \\Rightarrow w_2 + b > 0',
            why: 'These are the conditions for the perceptron to fire on the two positive XOR examples.' },
          { tex: '\\text{Adding the two inequalities: } \\; w_1 + w_2 + 2b > 0',
            why: 'A consequence of the previous step — both inequalities are strict, so their sum is strict.' },
          { tex: '\\text{But } b < 0 \\text{ (from (0,0)\\!\\mapsto\\!-1)} \\Rightarrow w_1 + w_2 + b > -b > 0',
            why: 'Subtracting b from the previous result and using b < 0.' },
          { tex: '\\text{Yet (1,1)\\!\\mapsto\\!-1 requires } w_1 + w_2 + b < 0. \\quad \\#',
            why: 'Contradiction: w_1 + w_2 + b cannot be both > 0 and < 0. So no such (w, b) exists. ∎' }
        ]
      },
      { label: 'Perceptron convergence theorem (Novikoff, 1962)',
        tex: '\\text{If data are linearly separable with margin } \\gamma, \\text{ then the perceptron converges in at most } \\left(\\dfrac{R}{\\gamma}\\right)^2 \\text{ updates}',
        note: 'Where \\(R = \\max_i \\lVert x_i \\rVert\\) and \\(\\gamma = \\min_i y_i (w^{\\star\\top} x_i)\\) for the optimal separator \\(w^\\star\\).',
        proof: [
          { tex: '\\text{Let } w^\\star \\text{ with } \\lVert w^\\star \\rVert = 1 \\text{ satisfy } y_i (w^{\\star\\top} x_i) \\ge \\gamma \\text{ for all } i.',
            why: 'Linear separability with margin γ means such a unit-vector separator exists.' },
          { tex: 'w^{(k+1)\\top} w^\\star \\;=\\; w^{(k)\\top} w^\\star + y_i x_i^\\top w^\\star \\;\\ge\\; w^{(k)\\top} w^\\star + \\gamma',
            why: 'After k updates the dot product with the true separator grows by at least γ each step.' },
          { tex: '\\lVert w^{(k+1)} \\rVert^2 \\;=\\; \\lVert w^{(k)} \\rVert^2 + 2 y_i w^{(k)\\top} x_i + \\lVert x_i \\rVert^2 \\;\\le\\; \\lVert w^{(k)} \\rVert^2 + R^2',
            why: 'On a mistake the middle term is ≤ 0; the norm-squared grows by at most R² per update.' },
          { tex: 'k \\gamma \\;\\le\\; w^{(k)\\top} w^\\star \\;\\le\\; \\lVert w^{(k)} \\rVert \\;\\le\\; \\sqrt{k R^2} \\;\\Longrightarrow\\; k \\le (R/\\gamma)^2',
            why: 'Combine Cauchy-Schwarz with the two recurrences. The update count is bounded; the algorithm halts. ∎' }
        ]
      },
    ],
    code: { lang: 'python', caption: 'The complete perceptron algorithm.',
      body:
`import numpy as np

def perceptron(X, y, epochs=20, lr=1.0):
    w = np.zeros(X.shape[1])
    b = 0.0
    history = []
    for epoch in range(epochs):
        mistakes = 0
        for xi, yi in zip(X, y):
            if yi * (w @ xi + b) <= 0:
                w += lr * yi * xi
                b += lr * yi
                mistakes += 1
        history.append((epoch, mistakes, w.copy(), b))
        if mistakes == 0:
            break
    return w, b, history`,
    },
    papers: [
      { ref: '1', title: 'The Perceptron: A Probabilistic Model for Information Storage and Organization in the Brain',
        authors: 'Rosenblatt, F.', venue: 'Psychological Review, 65(6), 386-408', year: 1958,
        url: 'https://psycnet.apa.org/record/1959-09865-001' },
      { ref: '2', title: 'Perceptrons: An Introduction to Computational Geometry',
        authors: 'Minsky, M. & Papert, S.', venue: 'MIT Press', year: 1969,
        url: 'https://mitpress.mit.edu/9780262630221/perceptrons/' },
      { ref: '3', title: 'On Convergence Proofs for Perceptrons',
        authors: 'Novikoff, A. B. J.', venue: 'Symposium on Mathematical Theory of Automata', year: 1962,
        url: 'https://en.wikipedia.org/wiki/Perceptron#Convergence_of_one_layer_perceptron_learning_algorithm' },
    ],
    interactive: { kind: 'perceptron' },
    compare: { title: 'Perceptron vs. MLP', rows: [
      ['Perceptron', 'Simple, interpretable, provably convergent on linearly separable data.', 'Cannot model XOR or any non-linear boundary.'],
      ['MLP',        'Learns non-linear representations via hidden layers.',                    'Harder to train; less interpretable.'],
    ]},
  },

  /* ---------- MLP / Backprop ---------- */
  {
    id: 'mlp', era: 'represent',
    year: '1986',
    title: 'MULTI-LAYER PERCEPTRON + BACKPROPAGATION',
    keyIdea: 'Hidden layers learn a representation; the chain rule trains them.',
    instl: 'UC San Diego · Carnegie Mellon · University of Toronto',
    authors: 'Rumelhart, Hinton, Williams (rediscovery); Werbos (1974)',
    narrative: `
      <p>The way out of the XOR trap was theoretical knowledge that had no
      practical implementation: stack perceptrons into <strong>hidden
      layers</strong> and put a non-linearity between them. Paul Werbos had
      already shown in his 1974 dissertation how the chain rule could update
      weights buried inside the network
      <span class="cite" data-cite="1">[1]</span>, but the result was little
      noticed for over a decade.</p>
      <p>The 1986 <em>Nature</em> paper by Rumelhart, Hinton, and Williams
      <span class="cite" data-cite="2">[2]</span> made
      <strong>backpropagation</strong> known to the AI mainstream. It is just
      the chain rule, applied carefully: errors at the output flow backward
      through the weights, and every layer gets a usable gradient. Suddenly
      every hidden weight had a computable update.</p>
      <p>This is the moment <em>representation learning</em> begins. The
      network no longer needs hand-engineered features. It discovers its own —
      a one-hidden-layer MLP literally rewrites the XOR problem in a space
      where it becomes linearly separable.</p>`,
    math: [
      { label: 'Forward pass',
        tex: 'h \\;=\\; \\sigma\\!\\big(W^{(1)} x + b^{(1)}\\big), \\quad \\hat y \\;=\\; g\\!\\big(W^{(2)} h + b^{(2)}\\big)',
        note: '\\(h\\) is the learned hidden representation; \\(\\sigma\\) is a non-linearity (sigmoid, tanh, or ReLU). Without \\(\\sigma\\) the network collapses to a single linear map.',
        proof: [
          { tex: '\\text{If } \\sigma(z) = z, \\text{ then } \\hat y = W^{(2)}(W^{(1)} x + b^{(1)}) + b^{(2)} = W^{(2)} W^{(1)} x + (W^{(2)} b^{(1)} + b^{(2)})',
            why: 'Composing two linear maps gives one linear map. The hidden layer adds no expressive power.' },
          { tex: '\\text{A single hidden layer with finite } \\sigma \\text{ is a universal approximator (Cybenko, 1989)}',
            why: 'Hornik / Cybenko: any continuous function on a compact set can be approximated to arbitrary accuracy by such a network.' }
        ]
      },
      { label: 'Backward pass — chain rule on the output layer',
        tex: '\\delta^{(2)} \\;=\\; \\dfrac{\\partial L}{\\partial z^{(2)}}, \\qquad \\dfrac{\\partial L}{\\partial W^{(2)}} \\;=\\; \\delta^{(2)} h^\\top, \\qquad \\dfrac{\\partial L}{\\partial b^{(2)}} \\;=\\; \\delta^{(2)}',
        note: 'The output-layer gradient is just an outer product of the output error and the hidden activation.',
        proof: [
          { tex: 'L = L(\\hat y), \\quad \\hat y = g(z^{(2)}), \\quad z^{(2)} = W^{(2)} h + b^{(2)}',
            why: 'Trace the dependence of L on the output weights through these three steps.' },
          { tex: '\\dfrac{\\partial L}{\\partial W^{(2)}_{ij}} \\;=\\; \\dfrac{\\partial L}{\\partial z^{(2)}_i} \\cdot \\dfrac{\\partial z^{(2)}_i}{\\partial W^{(2)}_{ij}} \\;=\\; \\delta^{(2)}_i \\cdot h_j',
            why: 'Apply the chain rule. The second factor is just h_j because z^{(2)}_i = Σ_j W^{(2)}_{ij} h_j + b^{(2)}_i.' },
          { tex: '\\text{In matrix form: } \\dfrac{\\partial L}{\\partial W^{(2)}} \\;=\\; \\delta^{(2)} h^\\top',
            why: 'Stacking the per-element gradients gives an outer product.' }
        ]
      },
      { label: 'Backward pass — hidden layer',
        tex: '\\delta^{(1)} \\;=\\; \\big((W^{(2)})^\\top \\delta^{(2)}\\big) \\;\\odot\\; \\sigma\'\\!\\big(z^{(1)}\\big)',
        note: 'Errors at the output are routed back through the weight matrix and modulated by the local activation derivative.',
        proof: [
          { tex: '\\delta^{(1)}_j \\;=\\; \\dfrac{\\partial L}{\\partial z^{(1)}_j} \\;=\\; \\sum_i \\dfrac{\\partial L}{\\partial z^{(2)}_i} \\cdot \\dfrac{\\partial z^{(2)}_i}{\\partial h_j} \\cdot \\dfrac{\\partial h_j}{\\partial z^{(1)}_j}',
            why: 'Two-step chain: error at the output → effect on hidden activation → effect on hidden pre-activation.' },
          { tex: '= \\sum_i \\delta^{(2)}_i \\cdot W^{(2)}_{ij} \\cdot \\sigma\'\\!(z^{(1)}_j) \\;=\\; \\big[(W^{(2)})^\\top \\delta^{(2)}\\big]_j \\cdot \\sigma\'\\!(z^{(1)}_j)',
            why: 'Substituting derivatives. The transpose appears because we are summing over output index i, not input index j.' }
        ]
      },
      { label: 'XOR, by construction',
        tex: 'h_1 = \\mathbf{1}\\{x_1 + x_2 \\ge 1\\}, \\;\\; h_2 = \\mathbf{1}\\{x_1 + x_2 \\ge 2\\}, \\;\\; \\hat y = \\mathbf{1}\\{h_1 - h_2 \\ge 1\\}',
        note: 'In the new \\((h_1, h_2)\\) space the four XOR points become linearly separable. The hidden layer literally rewrote the problem.',
        proof: [
          { tex: '(0,0) \\mapsto h = (0,0), \\;\\; (1,0) \\mapsto h = (1,0), \\;\\; (0,1) \\mapsto h = (1,0), \\;\\; (1,1) \\mapsto h = (1,1)',
            why: 'The two positive XOR points (1,0) and (0,1) collide at the single hidden representation (1,0). The negative points sit at (0,0) and (1,1).' },
          { tex: 'h_1 - h_2 \\ge 1 \\;\\Longleftrightarrow\\; h = (1, 0)',
            why: 'Among the three reachable hidden states, only (1,0) satisfies this — exactly the positive class.' }
        ]
      },
    ],
    code: { lang: 'python', caption: 'A complete backprop step for a 2-layer MLP.',
      body:
`def mlp_step(x, y, W1, b1, W2, b2, lr=0.1):
    # ---- forward ----
    z1 = W1 @ x + b1
    h  = np.tanh(z1)
    z2 = W2 @ h + b2
    yhat = z2                              # linear output
    loss = 0.5 * (yhat - y) ** 2

    # ---- backward (chain rule) ----
    d_yhat = (yhat - y)                    # ∂L/∂yhat
    dW2 = np.outer(d_yhat, h);  db2 = d_yhat
    d_h  = W2.T @ d_yhat                   # propagate
    d_z1 = d_h * (1 - h ** 2)              # tanh' = 1 - tanh²
    dW1 = np.outer(d_z1, x);    db1 = d_z1

    # ---- update ----
    return (W1 - lr*dW1, b1 - lr*db1,
            W2 - lr*dW2, b2 - lr*db2, loss)`,
    },
    papers: [
      { ref: '1', title: 'Beyond Regression: New Tools for Prediction and Analysis in the Behavioral Sciences',
        authors: 'Werbos, P. J.', venue: 'PhD thesis, Harvard', year: 1974,
        url: 'https://en.wikipedia.org/wiki/Paul_Werbos' },
      { ref: '2', title: 'Learning representations by back-propagating errors',
        authors: 'Rumelhart, Hinton, Williams', venue: 'Nature, 323(6088), 533-536', year: 1986,
        url: 'https://www.nature.com/articles/323533a0' },
      { ref: '3', title: 'Approximation by Superpositions of a Sigmoidal Function',
        authors: 'Cybenko, G.', venue: 'Mathematics of Control, Signals, and Systems, 2(4)', year: 1989,
        url: 'https://link.springer.com/article/10.1007/BF02551274' },
    ],
    interactive: { kind: 'mlp_xor' },
    compare: { title: 'Representation learning', rows: [
      ['Original space', 'XOR points form a checkerboard — no line separates them.', 'Perceptron fails.'],
      ['Hidden space',   'After \\((x_1,x_2) \\mapsto (h_1,h_2)\\), positives sit at one corner.', 'A single linear unit now solves it.'],
    ]},
  },

  /* ============================================================
     BATCHES 2-5 — kept from the previous version, ready to be
     deepened (proofs + paper references) in subsequent turns.
     ============================================================ */

  /* ---------- CNN ---------- */
  {
    id: 'cnn', era: 'represent',
    year: '1989 – 2012',
    title: 'CONVOLUTIONAL NEURAL NETWORKS',
    keyIdea: 'Architecture matches the structure of the data.',
    instl: 'Bell Labs · Univ. of Toronto · NYU',
    authors: 'LeCun (1989), Krizhevsky & Hinton (2012)',
    narrative: `
      <p>A fully-connected network treats every pixel as equally related to
      every other pixel. For a 100 × 100 image and 1,000 hidden units that is
      10 million weights — wasteful, because pixels are <em>spatially
      local</em>.</p>
      <p>LeCun's <strong>LeNet</strong> (1989, refined 1998
      <span class="cite" data-cite="1">[1]</span>) built this knowledge into
      the architecture. A small filter slides across the image and shares its
      weights everywhere. The technique sat quietly until
      <strong>AlexNet</strong> (2012 <span class="cite" data-cite="2">[2]</span>)
      crushed ImageNet — the start of the deep-learning explosion.</p>`,
    math: [
      { label: '2D convolution',
        tex: 'Y_{i,j} \\;=\\; \\sum_{a=0}^{m-1}\\sum_{b=0}^{n-1} K_{a,b}\\, X_{i+a,\\, j+b}',
        note: 'The same filter \\(K\\) is applied at every spatial position — parameter sharing.' },
      { label: 'Statistical efficiency',
        tex: '\\underbrace{10{,}000 \\times 1{,}000}_{\\text{fully connected}} \\;=\\; 10^{7} \\quad\\text{vs.}\\quad \\underbrace{64 \\times 9}_{\\text{64 conv filters}} \\;=\\; 576',
        note: 'Far fewer parameters → less data needed → less overfitting.' },
    ],
    code: { lang: 'python', caption: 'Manual 2D convolution.',
      body:
`def conv2d(image, kernel):
    H, W = image.shape
    kh, kw = kernel.shape
    out = np.zeros((H - kh + 1, W - kw + 1))
    for i in range(out.shape[0]):
        for j in range(out.shape[1]):
            patch = image[i:i+kh, j:j+kw]
            out[i, j] = (patch * kernel).sum()
    return out`,
    },
    papers: [
      { ref: '1', title: 'Gradient-Based Learning Applied to Document Recognition',
        authors: 'LeCun, Bottou, Bengio, Haffner', venue: 'Proc. IEEE, 86(11)', year: 1998,
        url: 'http://yann.lecun.com/exdb/publis/pdf/lecun-98.pdf',
        file: 'papers/Gradient-based_learning_applied_to_document_recognition.pdf' },
      { ref: '2', title: 'ImageNet Classification with Deep Convolutional Neural Networks',
        authors: 'Krizhevsky, Sutskever, Hinton', venue: 'NeurIPS 2012', year: 2012,
        url: 'https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks' },
    ],
    interactive: { kind: 'cnn' },
    compare: { title: 'MLP vs. CNN on images', rows: [
      ['MLP', 'General-purpose function approximator.', 'Ignores spatial structure; parameter-heavy.'],
      ['CNN', 'Locality + parameter sharing; efficient.', 'Built-in assumptions may not fit non-spatial tasks.'],
    ]},
  },

  /* ---------- RNN ---------- */
  {
    id: 'rnn', era: 'sequence',
    year: '1986 – 2010',
    title: 'RECURRENT NEURAL NETWORKS',
    keyIdea: 'Carry a hidden state through time — memory by recursion.',
    instl: 'UCSD · Toronto',
    authors: 'Elman, Jordan, Mikolov',
    narrative: `
      <p>Images come as fixed grids; language and speech do not. An RNN
      addresses this by introducing a <strong>hidden state</strong> that
      depends on both the current input and the previous hidden state. The
      network now has memory.</p>
      <p>Unrolling the recurrence shows that \\(h_t\\) is a learned summary of
      the <em>entire history</em>. In practice the model struggles: gradients
      flowing backward through many time steps shrink (vanishing) or explode.</p>`,
    math: [
      { label: 'Recurrence',
        tex: 'h_t \\;=\\; \\phi\\!\\big(W_x x_t \\,+\\, W_h h_{t-1} \\,+\\, b\\big)',
        note: 'Same weights at every timestep — a function applied repeatedly to its own output.' },
      { label: 'Why long-range learning is hard',
        tex: '\\frac{\\partial h_T}{\\partial h_t} \\;=\\; \\prod_{k=t+1}^{T} \\frac{\\partial h_k}{\\partial h_{k-1}}',
        note: 'A long product of Jacobians: components shrink toward 0 or blow up.' },
    ],
    code: { lang: 'python', caption: 'A vanilla RNN forward pass.',
      body:
`def rnn_forward(xs, h0, Wx, Wh, b):
    h = h0
    hidden_trace = [h]
    for x in xs:
        h = np.tanh(Wx @ x + Wh @ h + b)
        hidden_trace.append(h)
    return hidden_trace`,
    },
    papers: [
      { ref: '1', title: 'Finding Structure in Time',
        authors: 'Elman, J. L.', venue: 'Cognitive Science, 14(2)', year: 1990,
        url: 'https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1402_1' },
      { ref: '2', title: 'Learning long-term dependencies with gradient descent is difficult',
        authors: 'Bengio, Simard, Frasconi', venue: 'IEEE Trans. Neural Networks, 5(2)', year: 1994,
        url: 'https://ieeexplore.ieee.org/document/279181' },
    ],
    interactive: { kind: 'rnn' },
    compare: { title: 'RNN vs. feedforward', rows: [
      ['Feedforward', 'Treats each input independently.',                       'Cannot model order or context.'],
      ['RNN',         'Hidden state carries information forward through time.', 'Vanishing gradients; serial — hard to parallelise.'],
    ]},
  },

  /* ---------- LSTM ---------- */
  {
    id: 'lstm', era: 'sequence',
    year: '1997 / 2014',
    title: 'LSTM & GRU — GATED MEMORY',
    keyIdea: 'A learnable switch decides what to remember and what to forget.',
    instl: 'TU München · IDSIA · Montréal',
    authors: 'Hochreiter & Schmidhuber (LSTM); Cho et al. (GRU)',
    narrative: `
      <p>Hochreiter & Schmidhuber's 1997 <strong>LSTM</strong>
      <span class="cite" data-cite="1">[1]</span> added a parallel
      <em>cell state</em> \\(c_t\\) with an additive update path and three
      sigmoidal gates. The crucial line is the cell update: an additive
      path lets the gradient flow back through many time steps when the
      forget gate is open. Cho et al.'s 2014 <strong>GRU</strong>
      <span class="cite" data-cite="2">[2]</span> simplified the design.</p>`,
    math: [
      { label: 'LSTM gates',
        tex: '\\begin{aligned} f_t &= \\sigma(W_f x_t + U_f h_{t-1} + b_f) \\\\ i_t &= \\sigma(W_i x_t + U_i h_{t-1} + b_i) \\\\ o_t &= \\sigma(W_o x_t + U_o h_{t-1} + b_o) \\end{aligned}',
        note: 'Forget, input, output gates squash to [0,1].' },
      { label: 'Cell update',
        tex: 'c_t \\;=\\; f_t \\odot c_{t-1} \\;+\\; i_t \\odot \\tilde{c}_t, \\qquad h_t = o_t \\odot \\tanh(c_t)',
        note: 'New memory = (retained old) + (selected new). \\(f_t \\to 1\\) gives a clean gradient highway.' },
      { label: 'GRU update',
        tex: 'h_t \\;=\\; (1 - z_t) \\odot h_{t-1} \\;+\\; z_t \\odot \\tilde{h}_t',
        note: 'Same blend, fewer parameters.' },
    ],
    code: { lang: 'python', caption: 'One LSTM step.',
      body:
`def lstm_step(x, h_prev, c_prev, params):
    Wf, Wi, Wc, Wo, Uf, Ui, Uc, Uo, bf, bi, bc, bo = params
    f = sigmoid(Wf @ x + Uf @ h_prev + bf)
    i = sigmoid(Wi @ x + Ui @ h_prev + bi)
    o = sigmoid(Wo @ x + Uo @ h_prev + bo)
    c_tilde = np.tanh(Wc @ x + Uc @ h_prev + bc)
    c = f * c_prev + i * c_tilde
    h = o * np.tanh(c)
    return h, c, (f, i, o)`,
    },
    papers: [
      { ref: '1', title: 'Long Short-Term Memory',
        authors: 'Hochreiter, S. & Schmidhuber, J.', venue: 'Neural Computation, 9(8)', year: 1997,
        url: 'https://www.bioinf.jku.at/publications/older/2604.pdf' },
      { ref: '2', title: 'Learning Phrase Representations using RNN Encoder-Decoder for Statistical Machine Translation',
        authors: 'Cho, van Merriënboer, Gulcehre, et al.', venue: 'EMNLP 2014', year: 2014,
        url: 'https://arxiv.org/abs/1406.1078' },
    ],
    interactive: { kind: 'lstm' },
    compare: { title: 'LSTM vs. GRU', rows: [
      ['LSTM', 'Separate cell state \\(c_t\\); explicit f/i/o gates.', 'More parameters; slower.'],
      ['GRU',  'Single hidden state; fused update gate.',              'Slightly less expressive on some tasks.'],
    ]},
  },

  /* ---------- Word2Vec ---------- */
  {
    id: 'embeddings', era: 'attention',
    year: '2003 / 2013',
    title: 'NNLM & WORD2VEC — WORDS AS GEOMETRY',
    keyIdea: 'Replace one-hot symbols with dense vectors; meaning becomes a direction.',
    instl: 'Montréal · Google',
    authors: 'Bengio (NNLM); Mikolov et al. (Word2Vec)',
    narrative: `
      <p>Bengio's 2003 <strong>NNLM</strong>
      <span class="cite" data-cite="1">[1]</span> learned dense word vectors
      as a by-product of next-word prediction. Mikolov's 2013
      <strong>Word2Vec</strong> <span class="cite" data-cite="2">[2]</span>
      made it efficient at scale with skip-gram and negative sampling. Out came
      the famous arithmetic: <code>king − man + woman ≈ queen</code>.</p>`,
    math: [
      { label: 'Skip-gram objective',
        tex: '\\max_{\\theta} \\sum_{t=1}^{T} \\sum_{\\substack{-m \\le j \\le m \\\\ j \\ne 0}} \\log P_\\theta(w_{t+j} \\mid w_t)',
        note: 'Center word predicts its neighbours within a window.' },
      { label: 'Softmax over context',
        tex: 'P(o \\mid c) \\;=\\; \\dfrac{\\exp(v_o^\\top v_c)}{\\sum_{w \\in V} \\exp(v_w^\\top v_c)}',
        note: 'In practice replaced by negative sampling.' },
      { label: 'Cosine similarity',
        tex: '\\cos(v_a, v_b) \\;=\\; \\dfrac{v_a^\\top v_b}{\\lVert v_a\\rVert \\,\\lVert v_b\\rVert}',
        note: 'Angle in embedding space — closer to 1 means more related.' },
    ],
    code: { lang: 'python', caption: 'Skip-gram with negative sampling.',
      body:
`def skipgram_loss(v_c, v_o, v_neg):
    pos = np.log(sigmoid(v_o @ v_c))
    neg = np.sum(np.log(sigmoid(-v_neg @ v_c)))
    return -(pos + neg)`,
    },
    papers: [
      { ref: '1', title: 'A Neural Probabilistic Language Model',
        authors: 'Bengio, Ducharme, Vincent, Jauvin', venue: 'JMLR 3', year: 2003,
        url: 'https://www.jmlr.org/papers/v3/bengio03a.html' },
      { ref: '2', title: 'Distributed Representations of Words and Phrases and their Compositionality',
        authors: 'Mikolov, Sutskever, Chen, Corrado, Dean', venue: 'NeurIPS 2013', year: 2013,
        url: 'https://arxiv.org/abs/1310.4546',
        file: 'papers/1310.4546v1.pdf' },
    ],
    interactive: { kind: 'embeddings' },
    compare: { title: 'One-hot vs. embeddings', rows: [
      ['One-hot',    'Exact identity, easy to implement.',           'Every pair of distinct words is at distance \\(\\sqrt 2\\).'],
      ['Embeddings', 'Dense, low-dimensional, captures similarity.', 'Static — one vector per word, no context.'],
    ]},
  },

  /* ---------- Attention ---------- */
  {
    id: 'attention', era: 'attention',
    year: '2014',
    title: 'THE ATTENTION MECHANISM',
    keyIdea: 'Don\'t compress — directly look at the relevant tokens.',
    instl: 'Montréal',
    authors: 'Bahdanau, Cho, Bengio',
    narrative: `
      <p>Bahdanau et al. (2014 <span class="cite" data-cite="1">[1]</span>)
      let the decoder <em>look back at every encoder state</em> and form a
      weighted average — the weights are learned. Memory becomes something
      <em>selected by relevance</em>, not passed forward through a chain.</p>`,
    math: [
      { label: 'Attention weights',
        tex: '\\alpha_i \\;=\\; \\dfrac{\\exp(q^\\top k_i)}{\\sum_{j} \\exp(q^\\top k_j)} \\qquad c \\;=\\; \\sum_i \\alpha_i\\, v_i',
        note: 'Weights are non-negative and sum to 1 — context is a convex combination of values.' },
      { label: 'Why softmax sharpens',
        tex: '\\dfrac{\\alpha_i}{\\alpha_j} \\;=\\; \\exp(s_i - s_j)',
        note: 'A score gap of 2 produces a weight ratio of \\(e^2 \\approx 7.4\\).' },
    ],
    code: { lang: 'python', caption: 'Single attention step.',
      body:
`def attention(q, K, V):
    scores  = K @ q
    weights = softmax(scores)
    context = weights @ V
    return context, weights`,
    },
    papers: [
      { ref: '1', title: 'Neural Machine Translation by Jointly Learning to Align and Translate',
        authors: 'Bahdanau, Cho, Bengio', venue: 'ICLR 2015', year: 2014,
        url: 'https://arxiv.org/abs/1409.0473' },
    ],
    interactive: { kind: 'attention' },
    compare: { title: 'Memory through time vs. selection by relevance', rows: [
      ['RNN / LSTM', 'Information flows through hidden states.', 'Long-distance signal weakens.'],
      ['Attention',  'Direct access from any output to any input.', 'Compute grows quadratically with sequence length.'],
    ]},
  },

  /* ---------- Transformer ---------- */
  {
    id: 'transformer', era: 'attention',
    year: '2017',
    title: 'THE TRANSFORMER',
    keyIdea: 'Replace recurrence with self-attention; everything happens in parallel.',
    instl: 'Google Brain · Google Research',
    authors: 'Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin',
    narrative: `
      <p>"Attention Is All You Need" <span class="cite" data-cite="1">[1]</span>
      made attention the only sequence-processing primitive. Every token forms
      Q, K, V; the matrix \\(QK^\\top\\) gives every pair a relevance score in
      one matrix multiply. No recurrence, no step-by-step bottleneck.</p>`,
    math: [
      { label: 'Scaled dot-product attention',
        tex: '\\operatorname{Attention}(Q, K, V) \\;=\\; \\operatorname{softmax}\\!\\left( \\dfrac{Q K^\\top}{\\sqrt{d_k}} \\right) V',
        note: 'Two matrix multiplies and a softmax — embarrassingly parallel.' },
      { label: 'Why divide by \\(\\sqrt{d_k}\\)',
        tex: '\\operatorname{Var}(q^\\top k) \\;=\\; d_k \\;\\Longrightarrow\\; \\operatorname{Var}\\!\\left(\\dfrac{q^\\top k}{\\sqrt{d_k}}\\right) = 1',
        note: 'Without scaling, softmax saturates as \\(d_k\\) grows.' },
      { label: 'Multi-head attention',
        tex: '\\operatorname{MultiHead}(X) = \\operatorname{Concat}(\\text{head}_1, \\ldots, \\text{head}_H)\\, W_O',
        note: 'Each head learns a different relevance pattern.' },
      { label: 'Sinusoidal positions',
        tex: 'PE_{(\\text{pos},\\,2i)} = \\sin\\!\\left(\\tfrac{\\text{pos}}{10000^{2i/d}}\\right)',
        note: 'Adds a position signal so attention knows order.' },
    ],
    code: { lang: 'python', caption: 'Scaled dot-product attention.',
      body:
`def scaled_dot_attention(Q, K, V, mask=None):
    d_k = Q.shape[-1]
    scores = Q @ K.transpose(-2, -1) / np.sqrt(d_k)
    if mask is not None:
        scores = scores + mask
    weights = softmax(scores, axis=-1)
    return weights @ V, weights`,
    },
    papers: [
      { ref: '1', title: 'Attention Is All You Need',
        authors: 'Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin',
        venue: 'NeurIPS 2017', year: 2017,
        url: 'https://arxiv.org/abs/1706.03762',
        file: 'papers/1706.03762v7.pdf' },
    ],
    interactive: { kind: 'transformer' },
    compare: { title: 'Recurrent vs. Transformer', rows: [
      ['RNN/LSTM',    'Strong sequential intuition; streaming-friendly.', 'Serial; long-range info weakens.'],
      ['Transformer', 'Fully parallel; every token sees every other.',    'Cost is \\(O(T^2)\\) in sequence length.'],
    ]},
  },

  /* ---------- BERT ---------- */
  {
    id: 'bert', era: 'attention',
    year: '2018',
    title: 'BERT — UNDERSTANDING BY FILLING IN',
    keyIdea: 'Bidirectional pretraining via masked language modelling.',
    instl: 'Google Research',
    authors: 'Devlin, Chang, Lee, Toutanova',
    narrative: `
      <p>BERT <span class="cite" data-cite="1">[1]</span> used a Transformer
      encoder and masked language modelling. Because the model sees both sides
      of every blank, the representation it learns is <em>bidirectional</em>.</p>`,
    math: [
      { label: 'Masked language modelling',
        tex: '\\mathcal{L}_{\\text{MLM}}(\\theta) \\;=\\; -\\sum_{i \\in M} \\log P_\\theta\\!\\left(x_i \\,\\big|\\, x_{\\setminus M}\\right)',
        note: 'Predict masked tokens from their bidirectional context.' },
    ],
    code: { lang: 'python', caption: 'MLM training step.',
      body:
`tokens = tokenize("The capital of France is Paris.")
masked = random_mask(tokens, p=0.15)
logits = bert(masked)
target = tokens[masked == "[MASK]"]
loss   = cross_entropy(logits[mask_pos], target)`,
    },
    papers: [
      { ref: '1', title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
        authors: 'Devlin, Chang, Lee, Toutanova', venue: 'NAACL 2019', year: 2018,
        url: 'https://arxiv.org/abs/1810.04805',
        file: 'papers/1810.04805v2.pdf' },
    ],
    interactive: { kind: 'bert' },
    compare: { title: 'BERT vs. GPT', rows: [
      ['BERT (encoder)',  'Bidirectional; classification & QA.', 'Awkward at open-ended generation.'],
      ['GPT (decoder)',   'Left-to-right; natural for generation.', 'Cannot use future context.'],
    ]},
  },

  /* ---------- GPT-1 / 2 ---------- */
  {
    id: 'gpt12', era: 'modern',
    year: '2018 – 2019',
    title: 'GPT-1 & GPT-2 — GENERATE BY CONTINUING',
    keyIdea: 'Autoregressive pretraining + decoder-only Transformer. Scale begins to matter.',
    instl: 'OpenAI',
    authors: 'Radford, Narasimhan, Salimans, Sutskever',
    narrative: `
      <p>GPT-1 and GPT-2 trained a Transformer decoder to predict the next
      token. GPT-2 (1.5B params) showed striking zero-shot behaviour — the
      prompt itself starts to act like a task description.</p>`,
    math: [
      { label: 'Autoregressive factorisation',
        tex: 'P_\\theta(x_1, \\ldots, x_T) \\;=\\; \\prod_{t=1}^{T} P_\\theta\\!\\left(x_t \\,\\big|\\, x_1, \\ldots, x_{t-1}\\right)',
        note: 'Direct application of the chain rule of probability.' },
      { label: 'Causal mask',
        tex: 'M_{ij} = \\begin{cases} 0 & j \\le i \\\\ -\\infty & j > i \\end{cases}',
        note: 'Added to attention scores. Future tokens get zero weight.' },
    ],
    code: { lang: 'python', caption: 'Sampling from a GPT.',
      body:
`def generate(model, prompt, max_new=100, temperature=1.0):
    tokens = list(prompt)
    for _ in range(max_new):
        logits = model(tokens)[-1]
        probs  = softmax(logits / temperature)
        tokens.append(np.random.choice(len(probs), p=probs))
        if tokens[-1] == END_OF_TEXT: break
    return tokens`,
    },
    papers: [
      { ref: '1', title: 'Improving Language Understanding by Generative Pre-Training',
        authors: 'Radford, Narasimhan, Salimans, Sutskever', venue: 'OpenAI tech report', year: 2018,
        url: 'https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf' },
      { ref: '2', title: 'Language Models are Unsupervised Multitask Learners',
        authors: 'Radford, Wu, Child, Luan, Amodei, Sutskever', venue: 'OpenAI tech report', year: 2019,
        url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf' },
    ],
    interactive: { kind: 'gpt' },
    compare: { title: 'GPT-1 vs. GPT-2', rows: [
      ['GPT-1', '117M; generative pretraining + fine-tuning.', 'Needed task-specific fine-tuning.'],
      ['GPT-2', '1.5B; surprising zero-shot ability.',         'Hallucinates fluently.'],
    ]},
  },

  /* ---------- GPT-3 ---------- */
  {
    id: 'gpt3', era: 'modern',
    year: '2020',
    title: 'GPT-3 — SCALE & IN-CONTEXT LEARNING',
    keyIdea: '175B parameters. The prompt itself becomes the program.',
    instl: 'OpenAI',
    authors: 'Brown et al. (31 authors)',
    narrative: `
      <p>GPT-3 <span class="cite" data-cite="1">[1]</span> is two orders of
      magnitude larger than GPT-2. The surprising part was emergence: give it
      a few examples in the prompt and it solves new instances —
      <strong>in-context learning</strong>.</p>`,
    math: [
      { label: 'In-context learning',
        tex: 'P_\\theta(y \\mid (x_1, y_1), \\ldots, (x_k, y_k), x_{\\text{new}})',
        note: 'No parameter update — demonstrations live entirely in the prompt.' },
      { label: 'Scaling law',
        tex: 'L(N, D, C) \\;\\approx\\; L_{\\infty} \\,+\\, a\\, N^{-\\alpha} \\,+\\, b\\, D^{-\\beta} \\,+\\, c\\, C^{-\\gamma}',
        note: 'Loss falls as a power law in model size, data, and compute.' },
    ],
    code: { lang: 'python', caption: 'In-context learning prompt.',
      body:
`prompt = """\\
English: cat   -> French: chat
English: dog   -> French: chien
English: house -> French: """
print(gpt3.generate(prompt, max_tokens=4))   # -> "maison"`,
    },
    papers: [
      { ref: '1', title: 'Language Models are Few-Shot Learners',
        authors: 'Brown, Mann, Ryder, Subbiah, Kaplan, et al.', venue: 'NeurIPS 2020', year: 2020,
        url: 'https://arxiv.org/abs/2005.14165' },
      { ref: '2', title: 'Scaling Laws for Neural Language Models',
        authors: 'Kaplan, McCandlish, et al.', venue: 'arXiv 2001.08361', year: 2020,
        url: 'https://arxiv.org/abs/2001.08361' },
    ],
    interactive: { kind: 'scaling' },
    compare: { title: 'Scaling: power vs. price', rows: [
      ['Bigger model',  'Predictable improvement in loss.', 'Cost rises super-linearly.'],
      ['More data',     'Cheap insurance against under-training.', 'Quality and provenance bottleneck.'],
    ]},
  },

  /* ---------- ChatGPT / RLHF ---------- */
  {
    id: 'rlhf', era: 'modern',
    year: '2022',
    title: 'CHATGPT & RLHF — FROM PREDICTOR TO ASSISTANT',
    keyIdea: 'Align the model with human preference, not just next-token likelihood.',
    instl: 'OpenAI',
    authors: 'Ouyang et al. (InstructGPT)',
    narrative: `
      <p>A base GPT is a great text continuer. To make it an assistant,
      InstructGPT <span class="cite" data-cite="1">[1]</span> added supervised
      fine-tuning + RLHF: a reward model learns from pairwise human
      preferences, then PPO maximises that reward.</p>`,
    math: [
      { label: 'Supervised fine-tuning',
        tex: '\\mathcal{L}_{\\text{SFT}} \\;=\\; -\\sum_t \\log P_\\theta\\!\\left(y_t \\,\\big|\\, x, y_1, \\ldots, y_{t-1}\\right)',
        note: 'Same loss as pretraining, but on curated instruction-response pairs.' },
      { label: 'Reward model (Bradley-Terry)',
        tex: '\\mathcal{L}_{\\text{RM}} \\;=\\; -\\log \\sigma\\!\\big(r_\\phi(x, y^+) - r_\\phi(x, y^-)\\big)',
        note: 'Trains the chosen response to score higher than the rejected one.' },
      { label: 'PPO with KL penalty',
        tex: '\\max_{\\theta} \\;\\mathbb{E}\\!\\Big[ r_\\phi(x, y) - \\beta\\, \\mathrm{KL}\\!\\big(\\pi_\\theta \\,\\|\\, \\pi_{\\text{ref}}\\big) \\Big]',
        note: 'Maximise reward, but stay close to the reference policy.' },
    ],
    code: { lang: 'python', caption: 'Pairwise preference loss.',
      body:
`def preference_loss(reward_model, prompt, chosen, rejected):
    r_c = reward_model(prompt, chosen)
    r_r = reward_model(prompt, rejected)
    return -np.log(sigmoid(r_c - r_r))`,
    },
    papers: [
      { ref: '1', title: 'Training language models to follow instructions with human feedback',
        authors: 'Ouyang, Wu, Jiang, et al.', venue: 'NeurIPS 2022', year: 2022,
        url: 'https://arxiv.org/abs/2203.02155' },
      { ref: '2', title: 'Fine-Tuning Language Models from Human Preferences',
        authors: 'Ziegler, Stiennon, Wu, et al.', venue: 'arXiv 1909.08593', year: 2019,
        url: 'https://arxiv.org/abs/1909.08593' },
    ],
    interactive: { kind: 'rlhf' },
    compare: { title: 'Pretraining vs. RLHF', rows: [
      ['Pretraining',       'Broad linguistic structure.',                'Not aligned with user intent.'],
      ['Instruction + RLHF','Helpfulness, dialogue, instruction following.', 'Bias in preference data → bias in model.'],
    ]},
  },

  /* ---------- GPT-4 ---------- */
  {
    id: 'gpt4', era: 'modern',
    year: '2023',
    title: 'GPT-4 — REASONING, MULTIMODALITY, TOOLS',
    keyIdea: 'The model becomes an interface — to images, code, and the wider system.',
    instl: 'OpenAI',
    authors: 'OpenAI (200+ contributors)',
    narrative: `
      <p>GPT-4 <span class="cite" data-cite="1">[1]</span> accepts images as
      well as text and is rarely used alone. It calls tools — code
      interpreters, browsers, retrieval systems — and chains its outputs.
      The model is now the controller of a larger system.</p>`,
    math: [
      { label: 'Tool use as token prediction',
        tex: 'P_\\theta(\\text{action}_t \\mid x, \\text{action}_{<t}, \\text{obs}_{<t})',
        note: 'Tool calls are structured tokens; observations are fed back into context.' },
      { label: 'Chain-of-thought',
        tex: '\\arg\\max_{y}\\; \\sum_{z} P_\\theta(y, z \\mid x), \\;\\; z = \\text{reasoning}',
        note: 'Writing the reasoning before the answer improves accuracy.' },
    ],
    code: { lang: 'python', caption: 'ReAct-style tool loop.',
      body:
`def react(question, tools, model, max_steps=6):
    log = [f"Question: {question}"]
    for _ in range(max_steps):
        step = model.generate("\\n".join(log) + "\\nThought:")
        log.append("Thought: " + step.thought)
        if step.action == "FINAL":
            return step.answer
        log.append("Observation: " + tools[step.action](step.input))`,
    },
    papers: [
      { ref: '1', title: 'GPT-4 Technical Report',
        authors: 'OpenAI', venue: 'arXiv 2303.08774', year: 2023,
        url: 'https://arxiv.org/abs/2303.08774' },
      { ref: '2', title: 'ReAct: Synergizing Reasoning and Acting in Language Models',
        authors: 'Yao, Zhao, Yu, et al.', venue: 'ICLR 2023', year: 2022,
        url: 'https://arxiv.org/abs/2210.03629' },
    ],
    interactive: { kind: 'gpt4' },
    compare: { title: 'GPT-3.5 vs. GPT-4', rows: [
      ['GPT-3.5', 'Strong assistant; text only.',                    'Reasoning errors on multi-step problems.'],
      ['GPT-4',   'Multimodal; better reasoning; tool-use friendly.', 'Slower; expensive; still hallucinates.'],
    ]},
  },

  /* ---------- Open-source LLMs ---------- */
  {
    id: 'opensource', era: 'modern',
    year: '2023 →',
    title: 'OPEN-SOURCE LLM ECOSYSTEM',
    keyIdea: 'A second ecosystem: weights you can download, modify, run.',
    instl: 'Meta · Mistral · Alibaba · DeepSeek · Google · …',
    authors: 'many',
    narrative: `
      <p>Meta's LLaMA <span class="cite" data-cite="1">[1]</span> opened the
      door; Mistral, Qwen, DeepSeek, and others followed
      <span class="cite" data-cite="2">[2]</span>. Capability gaps to closed
      frontier models narrowed from years to months.</p>`,
    math: [
      { label: 'Low-Rank Adaptation (LoRA)',
        tex: 'W \\;=\\; W_0 \\,+\\, \\underbrace{B\\,A}_{\\text{rank } r \\ll \\dim}',
        note: 'Freeze \\(W_0\\); learn only the low-rank delta. Millions of parameters instead of billions.' },
    ],
    code: { lang: 'python', caption: 'LoRA — low-rank fine-tuning.',
      body:
`class LoRALinear(nn.Module):
    def __init__(self, base, r=8, alpha=16):
        super().__init__()
        self.base = base
        for p in self.base.parameters(): p.requires_grad = False
        d_in, d_out = base.in_features, base.out_features
        self.A = nn.Parameter(torch.randn(r, d_in) * 0.01)
        self.B = nn.Parameter(torch.zeros(d_out, r))
        self.scale = alpha / r
    def forward(self, x):
        return self.base(x) + self.scale * (x @ self.A.T @ self.B.T)`,
    },
    papers: [
      { ref: '1', title: 'LLaMA: Open and Efficient Foundation Language Models',
        authors: 'Touvron et al.', venue: 'arXiv 2302.13971', year: 2023,
        url: 'https://arxiv.org/abs/2302.13971' },
      { ref: '2', title: 'Qwen Technical Report',
        authors: 'Qwen team (Alibaba)', venue: 'arXiv 2407.10671', year: 2024,
        url: 'https://arxiv.org/abs/2407.10671',
        file: 'papers/2407.10671v4.pdf' },
      { ref: '3', title: 'LoRA: Low-Rank Adaptation of Large Language Models',
        authors: 'Hu, Shen, Wallis, et al.', venue: 'ICLR 2022', year: 2021,
        url: 'https://arxiv.org/abs/2106.09685' },
    ],
    interactive: { kind: 'opensource' },
    compare: { title: 'Closed vs. open', rows: [
      ['Closed frontier',   'Top capability; tightly controlled deployment.', 'Black-box; subject to a single org\'s decisions.'],
      ['Open ecosystem',    'Inspectable; cheaper to specialise.',             'Slightly behind frontier; harder to govern misuse.'],
    ]},
  },
];
