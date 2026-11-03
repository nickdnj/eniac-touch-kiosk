# ENIAC, Part 1 — What They Built, and Who Got Named

*Clean reading transcript. Produced from the approved script, `script/part-1.md`; narration text is
reproduced verbatim. Direction notes, speaker tags, and production markup have been removed.*

## Cold Open

On the seventeenth of January, nineteen forty-six, Herman Goldstine sent a batch of Army photographs from Philadelphia to a captain in the Office of the Chief of Ordnance in Washington. A machine, and the people who ran it. He attached a note saying many of them were — his words — exceedingly poor, and unsuitable for publication.

Underneath each photograph, a caption. And the captions name the people.

Miss Frances Bilas, Philadelphia. Miss Betty Jennings, Stanbury, Missouri. Miss Ruth Lichterman, Rockaway, New York. Miss Betty Snyder, Narberth, Pennsylvania. Miss Marlyn Wescoff, Philadelphia.

Named. With hometowns.

I want to be careful right at the top, because I had this wrong when I started. The version I'd absorbed is that the women were left out of the pictures. They weren't. They're in the pictures and they're in the captions, by name and by town.

Now read what the captions say they're doing.

Setting switches. Plugging in cables. Standing at a function table.

Thirteen days later, a different office produced a different document. War Department, Bureau of Public Relations, dated the thirtieth of January, nineteen forty-six. Three pages. It names three people as primarily responsible for the difficult technical phases of the work.

Eckert — engineering and design. Mauchly — fundamental ideas, physics. Goldstine — mathematics, technical liaison.

That one went to every newsroom in the country.

The photographs, the ones with the women's names on them, were judged unsuitable for publication.

Those are the two documents. This series is about the distance between them.

## Segment 1 — What This Is

The machine is ENIAC. Four episodes. And the subject isn't the machine — it's credit. Not who deserves it, which is the tidy question, but the machinery that assigns it.

Over about thirty years the credit for this machine got assigned four times by four different systems. A press office assigned it in nineteen forty-six. An institution assigned it, in job titles and payroll grades, for years after that. A market assigned it in the fifties. A federal court assigned it in nineteen seventy-three. Four naming machines, four different answers, and the one everybody remembers is the one handed down by a judge.

Part 1 is the machine and the press release. Part 2 is the programmers and the institution. Part 3 is a document, a company and a market. Part 4 is the court.

Three arguments run underneath. Who should get credit for the stored-program idea. The six women who programmed ENIAC — how they were written out and how they got written back in, which is not a balanced controversy; the erasure is documented and what's open is the why. And a patent, and a trial in nineteen seventy-three, which is the thing that gets quoted most and understood least.

My position on all three is that I'm not going to settle any of them. And I'm not going to call ENIAC the first computer. Not once, in four episodes — I'm saying it now so you're not waiting for a reveal. "First" isn't a fact about the world, it's a fact about a definition, and every definition in this story was written by somebody with an interest in where the line fell. Colossus existed. Zuse's machines existed. Atanasoff's ABC existed — special-purpose, and it never ran fully. The books that rank them do it by choosing the definition that produces their answer. So I'll tell you what ENIAC was — electronic, general-purpose, programmable, fast — and leave the ranking alone.

One more thing, about numbers, because this episode is mostly numbers.

Everything checkable here has been run back to a source, and a lot of it goes to the machine's own documentation — the nineteen forty-six *Report on the ENIAC*, five volumes, free on the Internet Archive, which I'd rather quote than quote somebody quoting.

And some of the most famous numbers about this machine go nowhere at all. They're in every book and on museum walls and they trace to one man's memory, or an uncited web page, or a sentence copied with a word missing. When I hit one of those I'll stop and say so. Not for every hedge — that would be unbearable. Only where it's a number you'd otherwise walk out of here and repeat.

And there are women all through this story who are in this episode only at the edges of it. That's deliberate. Six of them programmed ENIAC, and they're the whole subject of Part 2.

Right.

## Segment 2 — The Forcing Function

Nobody builds something like this because it's interesting. Somebody builds it because they have a problem they can't get out of.

The problem was firing tables. For every combination of gun and shell an artillery crew needs a book of numbers, because where the shell lands changes with range, elevation, projectile weight, temperature, air density, wind. To build the book you compute the flight path, over and over, one trajectory at a time. Goldstine's figure: one trajectory is on the order of seven hundred and fifty multiplications. That number survives every argument I'm about to walk you into, because it's work content, not wall-clock time.

Here's what it cost. February nineteen forty-four, a letter drafted for a general at Army Ordnance — Herman Goldstine wrote it — on the Ballistic Research Laboratory's situation. Even with the people and equipment then available, he says, it takes about three months of work on a two-shift basis to turn out the data for one firing table.

Three months. Per table.

Six months later, a Ballistic Research Laboratory memo, week ending the fifteenth of August, nineteen forty-four. Fifteen tables completed that week across all categories. Seventy-four in progress. And requests for new tables arriving at the rate of six per day.

Six requests a day against fifteen finished a week.

Flag the word "requests," because this is the first of the ones I promised you. You'll read in reputable places that the Army was demanding six firing tables a day. It wasn't. It was six *requests for new tables* a day. The word "requests" fell out of an Army historian's summary in nineteen ninety-six and everybody downstream copied the version without it.

That memo also declines to say how far behind they were. Its phrase is that the number of tables not started, for lack of computational facilities, "far exceeds" the number in progress. There's no backlog count in the document. People give one anyway.

So what did they have to attack it with? A room full of people doing arithmetic by hand — that's the next segment — and one machine. A differential analyzer, at the Moore School of Electrical Engineering at the University of Pennsylvania: mechanical, analog, fourteen integrators to the Army's own ten at Aberdeen, built in the Moore School's shops in the mid-thirties to Vannevar Bush's design. The Army didn't seize it, whatever you've read; there'd been a clause since the thirties, and in June of nineteen forty-two the Army exercised it and paid the university three dollars an hour.

Two things the popular version leaves out, and they both matter. It had to be physically re-geared for each new equation, so it wasn't simply the fast option — you couldn't readjust it every time a variable changed, which is why the bulk of the work stayed with the people. And it was less accurate than doing it by hand: Goldstine puts its precision at about five parts in ten thousand, roughly the utmost attainable by a machine of that kind.

The women at the desk calculators weren't just slower than the analyzer. They were more precise than it.

Which brings me to the most repeated set of numbers in this story, and the second flag.

Twenty hours by hand, fifteen minutes on the differential analyzer, thirty seconds on ENIAC. It's on museum walls, it's a fair comparison, and I'll use it. But nobody timed that in nineteen forty-four. It first appears in two Army publications in nineteen sixty-one, as a capability comparison for a hypothetical sixty-second trajectory, and the web page everyone cites is a restatement of those. Say it as a comparison. Don't say it as a stopwatch.

And trajectories per table is worse. Goldstine says assume three thousand. But the Army's own institutional history records the Aberdeen analyzer producing fifteen hundred and sixty trajectories across ten firing tables in the spring of nineteen forty-five — a hundred and fifty-six per table. An order of magnitude apart. They're probably counting different things, basic tables against full ones, but no source says so, and I'm not going to pretend it's settled.

One last thing, and it's what makes the rest of the story make sense. Every account of ENIAC that opens on the vacuum tubes has the causality backwards.

Nobody wanted a computer. Somebody wanted a table.

## Segment 3 — The Computers Were People

Before there was a machine at Penn doing this arithmetic, there were people at Penn doing it. Not an improvisation, not a wartime stopgap — an established profession with about a century behind it. "Computer" was a job title; it meant a person who computed. David Alan Grier's *When Computers Were Human* traces the tradition: organized hand calculation, done by teams, broken into steps, checked and rechecked and passed down a line like any production process. By the twentieth century that workforce was largely women.

The Moore School group had a name — the Computing Unit. Kay McNulty walked into it in the summer of nineteen forty-two and found a converted classroom holding about twelve women and four men at desk calculators, with large sheets of columned paper. It grew, outgrew the first floor, and moved into a pair of three-story houses on Walnut Street. At its peak, in McNulty's account, about a hundred women on two shifts — the incoming shift picking up the unfinished trajectory computations from the outgoing one and carrying them to the end.

Sit with that. A single trajectory outlived a working day and got handed across a shift boundary.

And the unit was one piece of something bigger. That February nineteen forty-four letter, the same sentence that gives three months per table, gives the headcount: a staff of a hundred and seventy-six computers in the Computing Branch. It's the strongest number in the set — contemporaneous, and written by the man running the Philadelphia operation.

They were recruited by newspaper ad. McNulty: "Just after graduation, I happened to see an ad in the daily paper. The Army was looking for women with a degree in mathematics — right here in Philadelphia."

Which was a problem, because there weren't many. Penn scoured its own alumnae lists hoping for twenty or thirty women with degrees in mathematics or physics and identified eight. Adele Goldstine went on the road — Bryn Mawr, Swarthmore, Goucher, her own Hunter College. Eventually the standard dropped and the Army advertised for female college graduates with *some* mathematics. For scale: Lila Todd graduated Temple in nineteen forty-one as the only woman with a major in mathematics out of about sixteen hundred in her class, because — her words — the head of the math department didn't think women should major in math.

So what were they hired as?

I can answer that precisely, because two of them wrote it down. Kay McNulty: "Fran and I went in together for the interview and were both accepted one week later as computers, S-P four, a subprofessional civil service grade." Lila Todd, independently: "I accepted a subprofessional appointment, S-P four, at the Ballistic Research Laboratory."

The title was "computer." The grade was S-P four. Subprofessional. That is not a metaphor and not a later interpretation — it's a civil service grade code, applied at hire, in writing, on day one. The Moore School offer on file is sixteen hundred and twenty dollars a year as an assistant computer, which is exactly what S-P four is called in the statute and exactly what step three of that grade paid.

And the statute is where this stops being an anecdote.

The Classification Act of nineteen twenty-three defines the Subprofessional Service. It's work that is — quoting the law — "incident, subordinate, or preparatory" to professional work. And it requires training "of any degree inferior to that represented by graduation from a college or university of recognized standing."

Read those two facts next to each other.

They ran a recruiting campaign specifically for women with college degrees in mathematics. And they hired them onto a pay scale the law defines as requiring less than a college degree.

That isn't an attitude. It's a grade code. And it was there before anybody had done anything — before there was a machine to be left out of the credit for. In Part 2 you'll hear a great deal about the word "operator," and that word is real and it does enormous damage. But "operator" is the *second* classification these women were given.

S-P four was the first.

One more and I'll stop. Barkley Fritz, who worked on ENIAC himself and collected these accounts from the women in nineteen ninety-five, puts the labor market in a sentence: several of the men originally working as civilian computers were drafted, and by nineteen forty-three, and for the balance of the war, essentially all computers were women — as were their direct supervisors.

So a room full of women doing ballistics arithmetic isn't an anomaly. It's the late stage of a mature industry. And that matters, because a fluke has no history — nothing leads to it and nothing follows from it, and a fluke is easy to forget. This wasn't one. Continuity is what makes an erasure detectable: if you know what came before, you can see the shape of what got removed.

That's Part 2. I said I'd stop.

## Segment 4 — Two Men and a Memo

In the summer of nineteen forty-one the Moore School ran a federally funded defense training course in electronics. About thirty students. Faculty lectured in the morning; a graduate student ran the afternoon labs.

The graduate student was J. Presper Eckert. One of the students was John Mauchly, who had a PhD.

Eckert, in an oral history decades later: "The curious thing was, I was the teacher and he was the student — although he had a PhD and I was simply studying for my master's at the time."

Mauchly was about eleven and a half years older. Not twelve; you'll see twelve everywhere. He'd walked into Johns Hopkins in nineteen twenty-five to study engineering, switched to physics as a sophomore, and walked out in nineteen thirty-two with a doctorate and no bachelor's degree at all. Then eight years at Ursinus College as head of the physics department — a department of one. He took the Moore School course on purpose, as a way in; he was one of two students out of thirty kept on as staff.

In August of nineteen forty-two he wrote up a memorandum, "The Use of High Speed Vacuum Tube Devices for Calculating." He gave it to three or four colleagues. It didn't go to the Army. Nobody answered. Mauchly: "It's like dropping a stone into the well and never hearing it splash."

Months later a lieutenant named Herman Goldstine got interested and asked to see the write-up. There wasn't a copy. Not Mauchly's, not anybody's.

What survived was the secretary's shorthand. She'd taken it by dictation, in Gregg, the notes were still in the building, and they re-transcribed the founding document of this entire project out of a stenographer's notebook. Two people confirm that independently, four years apart. You'll read that it survived as a carbon copy. It didn't.

The proposal went to Aberdeen on the ninth of April, nineteen forty-three. Eckert turned twenty-four that day — that's how the date is pinned; he says so himself. Mauchly became principal consultant, Eckert chief engineer at twenty-four, and he was twenty-six when the machine was unveiled.

Their two names are the ones on the patent. Hold onto that. It's the last thing you need from them this episode and the first thing you'll need in Part 4.

## Segment 5 — Eighteen Thousand Chances to Fail

The proposal was: do it with vacuum tubes.

The machine's own documentation says eighteen thousand of them, and I'll use that without hedging, because it's the figure in the nineteen forty-six report itself, in Adele Goldstine's volume, in a sentence that reads "the ENIAC's eighteen thousand vacuum tubes generate a considerable amount of heat" — which is a whole story in six words. Asked for an exact count, the honest answer is that the Army's nineteen fifty-five inventory of the rebuilt machine says seventeen thousand four hundred and sixty-eight. Different machines, different years.

Now do the reasoning the skeptics did. If a tube has some small chance of dying in a given hour, and eighteen thousand of them have to work at once for the machine to produce a right answer, the odds don't add — they compound. Take a component that's individually pretty good, multiply by eighteen thousand, and you get a machine that is in principle never working.

Good objection. And the answer is not the one I expected.

The answer is not that they found better tubes.

Adele Goldstine's volume puts it in one sentence. "In all cases, vacuum tubes in the ENIAC circuits are used only as on-off devices instead of as amplitude sensitive devices" — the presence or absence of a signal depends on whether a tube is conducting or not conducting, not on any measured magnitude of current and voltage. And then: "the machine has been so designed that signals are not constantly being degenerated, but instead are regenerated from time to time," out of the fundamental train of pulses.

Take that apart.

If a number is carried as a voltage level, every component it passes through nudges it, and the nudges accumulate, and you need all eighteen thousand components to be good. If a number is carried as whether a pulse is there or not, a weak tube that still switches is a working tube. And at each stage the signal isn't passed along — it's rebuilt, out of a clean master pulse train from the cycling unit.

So they didn't beat the compounding-odds argument by improving the odds. They beat it by building a machine that didn't care how good the tubes were. The Army said the same thing from the other side in nineteen sixty-one: accuracy of computation was assured by designing the basic circuits to work independently of the variable tolerances of their components.

That is what "digital" means. And it shows up here not as a philosophy of information but as a reliability strategy — a way to survive eighteen thousand mediocre parts.

Around that idea is a lot of ordinary engineering, and the folklore gets it wrong in about four places.

You'll read that Eckert ran the tubes at one quarter power. That's on Penn's own history page with nothing behind it. The sourced version is in the Maintenance Manual: practically all circuits in ENIAC were designed with at least a two-to-one safety factor, so loads and voltages can vary considerably without affecting operation.

You'll read that they never turned the machine off, because switching a tube on and off is what kills it. Half right: the Maintenance Manual is explicit that procedures were written to avoid subjecting the tubes to numerous heating and cooling cycles, which would increase the probability of failure. But "never turned off" appears in no contemporaneous document, and the machine contradicts it. There's a stop switch that kills the heaters, the power supplies and the fans. There's a standing instruction that units not in use may have their heaters switched off. And there's an on-off heater switch and an elapsed-hour meter on every one of the forty panels.

You don't build forty hour meters into a machine you never switch off. What that shows is a team metering tube-hours panel by panel and shutting down what wasn't in use — more sophisticated than the myth.

They kept a log; the standing order reads "keep log of all tube failures, list each tube." And — my favorite thing in the manuals — they built a rig to break it on purpose: a variable oscillator and a variable power supply, so the machine could be run off-frequency and off-voltage in order to, quote, increase the probability of failure. That's marginal checking, years before the term was common. You stress the machine deliberately so the components about to die do it now, in front of you, instead of in the middle of somebody's run.

So how well did it work?

You've heard that a tube failed about every two days. That's Eckert, in an interview in nineteen eighty-nine, recalling nineteen forty-six. He is the source; the Computer History Museum's version is downstream of him, and so is everybody else's. It may well be right. It's one man's memory forty-three years later, and it's the number to be slowest about stating as fact.

The Army's own contemporaneous figures are less flattering and more interesting. A nineteen fifty-five Ballistic Research Laboratory survey gives ENIAC a mean error-free running period of five point six hours, and about sixty-nine percent of scheduled hours actually delivering. A nineteen forty-eight report says flatly: at the time of writing, the ENIAC is being tested about half of the time. Ninety percent of service interruptions were tube failures. Fair caveat — those are Aberdeen numbers for the modified machine, not the nineteen forty-six machine at the Moore School. Nobody published the good version either.

And the heat was never solved. Blowers that couldn't move a hundred and seventy-four kilowatts of waste heat out of a warm room, and shortened tube life for it. Every panel had a thermostat that cut power to the whole machine if that panel passed a hundred and fifteen degrees. It could and did turn itself off.

And when it gave a wrong answer — which it did — somebody had to find out why. No error message. No log of the computation. A room of panels, eighteen thousand tubes inside them, and one of them had gone.

The Maintenance Manual sets it out as a formal staged procedure. After a test problem has indicated a failure, it says, it becomes a problem of localization. Find the unit. Then find the circuit — for which you need complete knowledge of Part Two of the technical report and efficient use of the block diagrams. Then the circuit failure itself: the most frequent failure in circuits is burned-out tubes.

Then the heuristics, which I love. If a circuit operates when it shouldn't, look for a failed inverter. If a circuit does not operate when it should, look for a failed gate or buffer.

And this: cathode failures in metal-case tubes can be detected at removal time by comparing case temperature with that of other tubes.

The dead one runs cold. You could find it with your hand.

That's the documented procedure. Here's who was doing it. Betty Jean Jennings — Bartik: "We could diagnose troubles almost down to the individual vacuum tube. Since we knew both the application and the machine, we learned to diagnose troubles as well as, if not better than, the engineer." A second programmer at Aberdeen, Homé McAllister Reitwiesner, says they were often able to point out to a technician which individual vacuum tube needed to be changed — and notice the division of labor in that, because it's more precise than the story you usually get. The programmer localized the fault. A technician changed the tube.

Eckert himself called the popular image — some guy running around with a box of tubes, changing one every few minutes — "another myth." The real thing is better anyway. A person reasoning backwards from a wrong number to the one component that must have produced it, holding the logical structure of the machine and the physical layout of the room in their head at once. That's not maintenance. That's debugging, in a form that no longer exists, because it was partly a physical search.

## Segment 6 — Programming Wasn't a Word Yet

You know what a plugboard is, so I'll skip the tour. What's worth saying is what the wiring *was*. The pattern of cables and switch settings wasn't how you gave ENIAC a program. It was the program. There was no other copy. It existed as a physical configuration of a room.

Which brings me to a line that gets repeated constantly and is wrong: that the people who programmed ENIAC had no documentation. No manuals. Nothing to work from. It usually shows up as an intensifier — it makes the achievement sound bigger.

It isn't true, and the correction is better than the myth.

There is a document. *A Report on the ENIAC*, dated the first of June, nineteen forty-six, produced for Army Ordnance under contract, in five volumes. The Operating Manual is Arthur Burks and Harry Huskey. The Maintenance Manual is a team of six men. Part Two of the technical description is Huskey.

And Part One of the technical description — two of the five volumes — is by Adele K. Goldstine. Sole credited author. Her name stands alone on that title page exactly as theirs stand on theirs. Part One is the volume that explains how the machine works without reference to its circuits; the report's own preface says it assumes no knowledge of electronics or circuit theory. The current standard scholarship calls those two volumes the most detailed guide ever produced to the functioning and programming of ENIAC in its original mode.

So saying there was no documentation erases her along with everything else. Which is a strange way to correct an erasure.

And I'll tell you how I found that out, because it's small and ugly. The research brief this episode was built from said Adele Goldstine wrote the manual — which overstates her share of a five-volume work and understates the thing her name is on alone. When I checked it against the title pages, the library catalogue record had compressed it one step further: Moore School as author, Adele Goldstine as one of eight contributors.

That happened in a database, in twenty twenty-six, while I was working on an episode about exactly this. I don't think it's sinister. That's the point. Nobody has to mean it.

So what was actually missing? Three things, and they're worse than missing paperwork.

There was no programming model. The diagrams told you what the machine *was*; they didn't tell you how to turn a computation into a configuration. And breaking a computation down for a room full of people, which that building had done for years, told you almost nothing about how to break one down for this.

There was no language — nothing between the problem in your head and the cables in your hands. No notation, no intermediate form you could reason in, or check, or hand to somebody else.

And there was nobody to ask. Not because the engineers were unavailable; they were right there. Because they knew how the machine worked and did not know how to program it. If you got stuck, there was no one in the world further along than you.

So how long did setting up a problem take? Everybody asks, and the answer is genuinely two answers.

The nineteen forty-six report doesn't say — and that's an absence, not a gap in my reading. The Operating Manual has a section headed "Problem Set Up Remarks" and it's entirely about checking the machine's units before a run. Part One gives the essential instructions for setting up a problem and never says how long it takes. The people who wrote the manuals didn't think of setup as a quantity worth reporting.

The first person to put a number on it was an Army mathematician named Clippinger, in a Ballistic Research Laboratory report in September of nineteen forty-eight — and he did it at the moment he was arguing for getting rid of it. He'd built a new way of running the machine, problems going in by setting switches on the function tables instead of replugging cables. His sentence: problems can probably be changed in an hour, instead of a day by the old method, where many cables had to be plugged in and out.

An hour instead of a day. And in the same paragraph, the price: the new system reduced the machine's computing speed by a factor of six.

They took the deal.

In nineteen forty-eight the Army made its fastest computer six times slower at arithmetic in order to make it a day faster to reprogram, and judged that a clear win. That's the whole history of software in one memo, and it's dated.

One caution, since a docent will get asked. Clippinger's "a day" is the physical replugging of a problem whose configuration already exists. Other Army accounts say weeks of checking and setup, and they aren't contradicting him — they're including the part where you *design* the configuration and prove it out. Different jobs. That nobody at the time had settled vocabulary to separate them is the point of this whole segment.

## Segment 7 — Too Late

The Moore School group worked on this from nineteen forty-three. The war ended in the summer of nineteen forty-five.

The Army took delivery on the first of December, nineteen forty-five — and I want to flag where that date comes from, because it matters later. Not from the Moore School's records. From a federal judge, who fixed it twenty-eight years afterward, in a courtroom, because by then the exact day the Army took delivery had become worth a great deal of money. Part 4. And note that formal acceptance by the Ordnance Department is a separate event, in July of nineteen forty-six. Delivery and acceptance aren't the same thing; loose accounts merge them.

So the machine built to break a wartime arithmetic bottleneck arrived after the war was over.

Here's what it actually did first. Not a firing table. In the late autumn of nineteen forty-five two physicists from Los Alamos, Stanley Frankel and Nicholas Metropolis, brought a problem east and took over the machine for several weeks, running into early nineteen forty-six. A greatly simplified feasibility model for the ignition of a fusion weapon. Metropolis, in an oral history: "It was the very first problem that was done on the ENIAC." And it was big — his estimate is it taxed maybe ninety-five percent of the controls of the machine, against maybe twenty or twenty-five percent for a firing table. The Army delayed shipping ENIAC to Aberdeen so the run could finish.

Two things about that. The people running it were not told what it was — highly classified, and in Metropolis's words, the people there did not know what the problem was. The Moore School staff who helped were handed the mathematics and nothing else.

And it gets merged with two later things, which it shouldn't. Nineteen forty-five at the Moore School is a feasibility model, and it is not a Monte Carlo simulation. The first computerized Monte Carlo runs are nineteen forty-eight, at Aberdeen, on a converted machine, and they're about fission. The runs that finally convinced Edward Teller his design didn't work are nineteen fifty. "ENIAC did the H-bomb calculations" collapses all three.

And the thing the machine was built for — trajectory computation — didn't start coming off it as production work until August of nineteen forty-six.

A machine built for the Army, on Army money, for an Army problem, has a very clear answer to who it belongs to and what it's worth. A machine that has outlived its problem, and is now the fastest calculating device in existence, has a much less clear answer to both — and a great many more people who'd like to have a view.

That's Part 3. But it's roughly the position you want to be in if you're about to hold a press event.

## Payoff / Close — The Two Documents, Again

There were two events, not one, and almost every retelling merges them.

Friday the first of February, nineteen forty-six: a press preview at the Moore School, embargoed. Arthur Burks ran it. And because reporters afterward asked what on earth they'd just seen, Penn's publicity office had Burks write the program down. So we have it, item by item.

He loaded a five-digit number into an accumulator and had the machine add it to itself five thousand times. The answer was there in one second. Then the same five thousand additions at a thousandth speed, so the audience could watch it happen — because the fastest general-purpose machine that existed before ENIAC would have needed sixteen and two-thirds minutes for it. Then a table of squares and cubes of the numbers one to a hundred, punched onto cards: about a minute, almost all of it punching. Then the same table without punching, finished in a tenth of a second. Burks's own note: so fast, in fact, that some who blinked didn't see it.

And then the last item, in his words: "It is a problem of great importance to the Ordnance Department, but since it is classified as secret not very much can be said about it… In solving it the ENIAC did in fifteen seconds what a mathematician would require several weeks to do."

That was the Los Alamos problem. The bomb calculation was the closing number of the press demonstration, and nobody in the room was told.

No trajectory ran on the first of February.

Friday the fifteenth: the formal unveiling and dedication, and a dinner, at Houston Hall on the Penn campus. Penn's president presided. The head of the National Academy of Sciences spoke. A major general from the Office of the Chief of Ordnance pressed the button that turned ENIAC on.

And here I have to be careful, because the most famous story about this machine lives on the fifteenth, and it is a reconstruction.

We don't have a record of what was run that day. The best current scholarship — a two thousand twenty-one paper rebuilding the demonstration — offers it as an explicit working hypothesis: probably the same program as the first, with an artillery trajectory swapped in for the Los Alamos problem, because a classified computation you can't explain doesn't make a good demonstration. The author says plainly that he hasn't found the records. And the line everyone quotes, that the machine computed the shell's flight faster than the shell flew, comes from a talk Arthur Burks gave in nineteen seventy-four. It isn't in the contemporaneous material, because no trajectory ran on the day that material describes. Two smaller ones: nobody documents a hundred and fifty-five millimeter shell, so say "an artillery shell." And the press date you'll see given as Saturday, February fourteenth — the fourteenth was a Thursday.

The night before is well attested, though. Betty Snyder and Betty Jean Jennings had the trajectory program running, and on the night of the fourteenth it ran past the ground and wouldn't stop. Snyder came in the next morning knowing exactly which switch on the master programmer was set wrong, moved it one position, and they were in business. Which switch, we don't know. Don't let anybody tell you they do.

Now. The War Department release.

Three pages, and it gave the American press its headline. The sentence: "The first problem put on the ENIAC, which would have required one hundred man-years of trained computer's work, was completed in two weeks — of which two hours was actual electronic computing time."

That first problem is the hydrogen bomb feasibility calculation. The classified one. A press office handed a hundred reporters a number describing work nobody in the building was permitted to describe, the reporters had no way to check it, and it ran.

"Army Robot Brain Does One Hundred Years Math in Two Hours." "One-Hundred-Year Problem Done in Two Hours." "Man-Made Mental Giant No Longer Army's Secret."

And the *New York Times* added its own: had the machine not been available, the job would have kept busy one hundred trained men for a whole year.

One hundred man-years. One hundred trained men. The workforce that number is measured against was almost entirely women. They are the unit of measure. They're in the sentence and they're not in the sentence.

The release named three people as responsible. Eckert. Mauchly. Goldstine. And it drew a line, as those documents always do, between the people responsible for a thing and the people operating it.

Operator. Look at what that word carries. The thinking happened upstream; what's left down here is execution. Once it's attached to somebody, everything after it follows automatically and nobody has to make another decision. Operators don't go in the caption, because the machine is the story and the operator is furniture. Operators don't get invited to the dinner, because the dinner is for the people responsible. Operators don't turn up in institutional histories, because institutional histories are about design decisions and an operator by definition didn't make any.

Several of the women were at the demonstration. Some are in the press photographs. They weren't introduced, weren't named in the coverage, and in some pictures were misidentified. And they weren't at the dinner — and I'll flag that that rests on their own testimony and Penn's own concession rather than on a document; no guest list has been found. Jean Bartik's recorded reaction is five words. "We were sort of horrified."

And remember Segment 3. "Operator" was the second classification. The first was S-P four, subprofessional, and it was on the hiring paperwork before any of this happened.

I said at the top that this series is about the machinery that assigns credit.

That's the machinery. It isn't a conspiracy. There's no meeting where somebody decides to write six people out. It's a War Department press office writing three pages on a deadline and fitting the responsible parties into one line. It's a caption writer working from the release. It's an institutional historian working from the newspapers. Each of them doing an ordinary job at ordinary speed with the material in front of them, and each version slightly cheaper than the last.

The Army wrote the hype. Penn wrote the correction, because reporters asked. And the photographs where the women are named, with their hometowns — those are the ones somebody looked at and judged unsuitable for publication.

Named, and described as setting switches. Filed, and not sent.

That's how it actually happens. Not by malice. By a series of reasonable-looking compressions, none of them reversible without somebody deciding to go back and do the work.

It took about fifty years before somebody did.

Next time: the six women. What the job actually was, why it stopped being called programming, and the twenty-five years it took to get the names back into the caption — which is a much better story than the one where a book comes out and fixes everything.

## Outro

Nearly every number in this episode came from documents that are free and online. *A Report on the ENIAC*, all five volumes, nineteen forty-six, at the Internet Archive. The War Department press release, scanned. Clippinger's nineteen forty-eight report and Kempf's nineteen sixty-one Army monograph, on the Army Research Laboratory's own server. And Barkley Fritz's "The Women of ENIAC," from nineteen ninety-six, which is where the women speak for themselves.

For the history around them: *ENIAC in Action*, by Thomas Haigh, Mark Priestley and Crispin Rope. David Alan Grier's *When Computers Were Human*. And Jennifer Light's nineteen ninety-nine article, "When Computers Were Women," which is where the two documents in the cold open are reproduced.

Where I couldn't source something, I left it out and told you. There'll be more of that in Part 4 than anywhere else.

This has been Part 1.
