/* =====================================================================
   FIELD REPORTS: real, public cases that show the method working or
   failing outside Meridian. Each one is tied to the capabilities,
   verdicts and guardrails it illustrates, so the game can surface the
   right case at the right moment, and it is collected into the player's
   case library when first met.

   Every figure here was checked against the source named on the card in
   October 2026. Where sources disagree, the card uses the most
   conservative figure or says whose number it is. When you add a case,
   keep to the same rule: a named source, a figure you can find in it,
   and a lesson that is about the step, not the brand.
   ===================================================================== */
export const FIELD_REPORTS = [
 {id:'aircanada', title:'The chatbot that made a promise', org:'Air Canada', year:2024, kind:'warning',
  caps:['converse','retrieve'], verdicts:['assist','prepare'], guardrails:['escalation','sampling'], shapes:['lookup'],
  what:'A customer asked the airline’s website chatbot about bereavement fares. It told him he could claim the discount after travelling, which contradicted the airline’s own policy page. The airline argued the chatbot was responsible for its own words.',
  outcome:'British Columbia’s Civil Resolution Tribunal disagreed in February 2024. It held the airline responsible for everything on its website, chatbot included, and ordered it to pay about CAD 812 in damages, interest and fees.',
  lesson:'A conversational assistant speaks for the organisation. Ground it in the current policy, and give people a clear path to a person.',
  source:{name:'Moffatt v. Air Canada, 2024 BCCRT 149; reported by Fox Business', url:'https://foxbusiness.com/lifestyle/air-canada-chatbot-gave-customer-wrong-info-airline-pay'}},

 {id:'avianca', title:'Six cases that did not exist', org:'Mata v. Avianca (US District Court, SDNY)', year:2023, kind:'warning',
  caps:['draft','retrieve'], verdicts:['assist'], guardrails:['sampling','logging'], shapes:['draft','lookup'],
  what:'Lawyers filed a brief citing six court decisions that a general-purpose chatbot had supplied. Opposing counsel could not find them, because they had never existed.',
  outcome:'In June 2023 the judge fined the lawyers and their firm $5,000 The underlying case was dismissed.',
  lesson:'Drafting is not checking. Anything an LLM writes that will be relied on needs its claims traced to a source by an accountable person.',
  source:{name:'Mata v. Avianca, Inc., 678 F. Supp. 3d 443 (S.D.N.Y. 2023); summary on Wikipedia', url:'https://en.wikipedia.org/wiki/Mata_v._Avianca,_Inc.'}},

 {id:'knight', title:'Forty-five minutes of old code', org:'Knight Capital', year:2012, kind:'warning',
  caps:['rules','agent'], verdicts:['engineering'], guardrails:['rollback','logging'], shapes:['coordinate','check'],
  what:'A routine software release reached seven of eight trading servers. On the eighth, a reused setting woke up retired order-routing logic, which began sending orders the moment the market opened. Automated warnings went out before the open and were not read as alarms.',
  outcome:'In about 45 minutes the firm lost roughly $440 million on the positions it had built up, according to its own accounts (the SEC’s order puts the figure higher).',
  lesson:'Even plain, rule-based automation needs a tested rollback, a log someone watches, and a fast way to stop it. Autonomy without a brake is the risk, whether or not AI is involved.',
  source:{name:'SEC Release No. 70694 (2013); account by bad.technology', url:'https://bad.technology/articles/knight-capital-loses-440-million-in-45-minutes-from-misdeployed-trading-algorithm.html'}},

 {id:'genaiwork', title:'Support agents and an assistant', org:'Brynjolfsson, Li and Raymond (NBER)', year:2023, kind:'success',
  caps:['recommend','draft','retrieve'], verdicts:['assist','pilot'], guardrails:['sampling'], shapes:['lookup','draft'],
  what:'A study of more than 5,000 customer support agents at one company, whose access to an AI assistant that suggested responses was rolled out in stages.',
  outcome:'The working paper found resolutions per hour rose 14% on average and 34% for the newest and least-skilled agents, with little effect on the most experienced. The later published version reports a 15% average gain.',
  lesson:'Assist mode spreads what the best people already know. The biggest gains often go to newcomers, which matters when you decide who to pilot with.',
  source:{name:'NBER Working Paper 31161, “Generative AI at Work”', url:'https://nber.org/papers/w31161'}},

 {id:'jagged', title:'The jagged frontier', org:'Harvard Business School and BCG', year:2023, kind:'mixed',
  caps:['draft','summarize','recommend'], verdicts:['assist','pilot'], guardrails:['sampling','escalation'], shapes:['draft','decide','suggest'],
  what:'758 consultants were given realistic tasks, some inside what GPT-4 could do well and one deliberately just outside it, with and without the tool.',
  outcome:'Inside the frontier, consultants with the tool completed 12.2% more tasks, 25.1% faster, at markedly higher quality. On the task outside it, they were 19 percentage points less likely to reach the correct answer than those without it.',
  lesson:'Tasks that look equally hard to people are not equally hard for the tool. Reading each step honestly is how you find which side of the frontier it sits on.',
  source:{name:'Dell’Acqua et al., HBS Working Paper 24-013; reported by The Harvard Crimson', url:'https://www.thecrimson.com/article/2023/10/13/jagged-edge-ai-bcg/'}},

 {id:'klarna', title:'Two-thirds of the chats', org:'Klarna', year:2024, kind:'mixed',
  caps:['converse','agent','retrieve'], verdicts:['pilot','prepare'], guardrails:['escalation','sampling'], shapes:['lookup','coordinate'],
  what:'The payments company put an AI assistant in front of its customer service chats across 23 markets and more than 35 languages.',
  outcome:'In its first month the company reported 2.3 million conversations, about two-thirds of its service chats, which it described as the work of 700 full-time agents, with repeat inquiries down 25%. These are the company’s own figures.',
  lesson:'High-volume, repetitive questions are where a conversational front door pays. Measure repeat contacts and satisfaction, not just volume, and keep the handoff to a person.',
  source:{name:'Klarna announcement, February 2024; reported by The Decoder', url:'https://the-decoder.com/klarna-says-openais-ai-agent-does-the-work-of-700-support-agents/'}},

 {id:'zillow', title:'When the forecast is the business', org:'Zillow Offers', year:2021, kind:'warning',
  caps:['predict'], verdicts:['park','assist'], guardrails:['sampling','rollback'], shapes:['predict','decide'],
  what:'The company bought homes directly, at prices set with the help of its forecasts, planning to resell them. In 2021 the market moved faster than the forecasts.',
  outcome:'In November 2021 the board decided to wind the business down. The company wrote down $304 million of inventory that quarter and expected to cut about 25% of its workforce. Its chief executive said the unpredictability of home prices far exceeded what it had anticipated.',
  lesson:'A forecast is only as good as the conditions it learned from. When patterns shift, someone must be able to override it, and the stakes must be sized to the forecast’s real error.',
  source:{name:'Zillow Group Form 8-K and Form 10-K, 2021 (SEC EDGAR)', url:'https://www.sec.gov/Archives/edgar/data/1617640/000161764021000085/z-20211102.htm'}},

 {id:'amazonhire', title:'The recruiting model that learned the past', org:'Amazon', year:2018, kind:'warning',
  caps:['recommend','classify'], verdicts:['assist'], guardrails:['bias','escalation'], shapes:['decide','route','suggest'],
  what:'From 2014 a team built a system that rated job applicants from one to five stars, learning from the résumés the company had received in the past.',
  outcome:'By 2015 it was found not to rate candidates for technical roles in a gender-neutral way, because it had learned the pattern of who had been hired before. Recruiters had looked at its scores but never relied on them alone; the project was disbanded.',
  lesson:'Decisions about people inherit the bias in past decisions. Keep a person accountable, review outcomes across groups, and ask whether the step should be a target at all.',
  source:{name:'Reuters, 10 October 2018 (Jeffrey Dastin); syndicated by CNBC', url:'https://www.cnbc.com/2018/10/10/amazon-scraps-a-secret-ai-recruiting-tool-that-showed-bias-against-women.html'}},

 {id:'orion', title:'Routes, not chat', org:'UPS (ORION)', year:2016, kind:'success',
  caps:['optimize'], verdicts:['pilot','prepare'], guardrails:['rollback'], shapes:['allocate'],
  what:'The delivery company built an optimisation system that plans each driver’s route under real constraints: delivery windows, pickups, and the order of stops.',
  outcome:'The company has said ORION saves drivers several miles a day each, adding up to about 100 million fewer miles and 10 million gallons of fuel a year, and $300–400 million a year at full deployment. Drivers can still depart from the plan.',
  lesson:'Scheduling and routing are a different kind of AI from language models, and often a bigger prize. Let planners override the plan, and feed their reasons back.',
  source:{name:'INFORMS Edelman case study, UPS ORION', url:'https://www.informs.org/Impact/O.R.-Analytics-Success-Stories/UPS-On-Road-Integrated-Optimization-and-Navigation-ORION-Project'}},

 {id:'robodebt', title:'Automating a judgment that was never lawful', org:'Australian Government (Robodebt)', year:2023, kind:'warning',
  caps:['rules'], verdicts:['fix','assist'], guardrails:['escalation','bias'], shapes:['decide','check'],
  what:'From 2015 an automated scheme matched welfare records against tax data and averaged annual income across fortnights to raise debts, putting the burden on recipients to disprove them.',
  outcome:'The Federal Court found in 2019 that averaging alone could not establish a debt. A class action settled for about A$1.8 billion including repaid and wiped debts, and a Royal Commission in 2023 called the scheme crude and cruel, neither fair nor legal.',
  lesson:'Automating a step does not make it right. If the underlying rule is wrong, a machine applies it faster and to more people. Fix the process first, and keep a person accountable for decisions about people.',
  source:{name:'Royal Commission into the Robodebt Scheme, Report (2023), via APO', url:'https://apo.org.au/node/323427'}},

 {id:'toeslagen', title:'A risk score built on nationality', org:'Dutch Tax and Customs Administration', year:2021, kind:'warning',
  caps:['classify','anomaly'], verdicts:['assist','fix'], guardrails:['bias','escalation','logging'], shapes:['route','check','decide'],
  what:'A self-learning risk classification model flagged childcare benefit applications for fraud checks, and used whether the applicant held Dutch nationality as one of its factors.',
  outcome:'Tens of thousands of families were wrongly treated as fraudsters, many with migrant backgrounds. The Dutch data protection authority found the processing unlawful and discriminatory, and the scandal brought down the government in January 2021.',
  lesson:'Routing people into scrutiny is a decision about people. Review what the model uses, check outcomes across groups, and give everyone a way to reach a person.',
  source:{name:'Amnesty International, “Xenophobic machines” (October 2021)', url:'https://www.amnesty.org/en/latest/news/2021/10/xenophobic-machines-dutch-child-benefit-scandal/'}},

 {id:'sepsis', title:'The model that missed two in three', org:'University of Michigan study of the Epic Sepsis Model', year:2021, kind:'warning',
  caps:['predict','anomaly'], verdicts:['assist','prepare'], guardrails:['sampling','threshold'], shapes:['predict','check'],
  what:'A widely deployed hospital model alerted clinicians to patients likely to develop sepsis. Researchers tested it independently on 38,455 hospitalisations at their own hospitals.',
  outcome:'They found it identified only 33% of the patients who developed sepsis, while alerting on 18% of all patients. The vendor disputed how sepsis onset was defined.',
  lesson:'Test a model on your own data before trusting the vendor’s number. Accuracy sampling is not a formality; it is how you find out what you bought.',
  source:{name:'Wong et al., JAMA Internal Medicine, June 2021; summary from Michigan IHPI', url:'https://ihpi.umich.edu/news/popular-sepsis-prediction-tool-less-accurate-claimed'}},

 {id:'copilotdev', title:'Developers and a pair programmer', org:'Microsoft Research, GitHub and MIT', year:2023, kind:'success',
  caps:['draft','agent'], verdicts:['pilot','engineering'], guardrails:['sampling'], shapes:['draft'],
  what:'A controlled experiment asked developers to build a small web server in JavaScript, half of them with an AI coding assistant and half without.',
  outcome:'The group with the assistant finished 55.8% faster on average. The authors note the result is for one well-defined task.',
  lesson:'For developers building rules, integrations and pipelines, a coding assistant shortens the build. The engineering verdict still stands; it just gets cheaper.',
  source:{name:'Peng et al., “The Impact of AI on Developer Productivity” (arXiv 2302.06590)', url:'https://arxiv.org/abs/2302.06590v1'}},

 {id:'ukcopilot', title:'Twenty-six minutes a day', org:'UK Government Digital Service', year:2025, kind:'success',
  caps:['draft','summarize','retrieve'], verdicts:['pilot'], guardrails:['privacy','sampling'], shapes:['draft','summarize'],
  what:'About 20,000 civil servants across a dozen departments used an assistant built into their email, documents and meetings for three months at the end of 2024.',
  outcome:'Participants reported saving an average of 26 minutes a day, mostly on drafting and summarising, and 82% said they would not want to go back. The figures are self-reported.',
  lesson:'Where the work already lives in email, documents and meetings, an assistant inside those tools is the low-friction start. Measure time saved, and check the drafts.',
  source:{name:'GOV.UK press release, June 2025', url:'https://www.gov.uk/government/news/landmark-government-trial-shows-ai-could-save-civil-servants-nearly-2-weeks-a-year'}},

 {id:'coin', title:'Reading twelve thousand contracts', org:'JPMorgan Chase (COIN)', year:2017, kind:'success',
  caps:['extract'], verdicts:['pilot','prepare'], guardrails:['threshold','sampling'], shapes:['extract'],
  what:'The bank built software to read commercial loan agreements and pull out the clauses and data points that lawyers and loan officers had been extracting by hand.',
  outcome:'Reporting at the time said the work had taken about 360,000 hours a year across roughly 12,000 new agreements, and that the bank credited the system with fewer servicing errors.',
  lesson:'Extraction from documents in a known family is one of the most reliable wins. The prize is measured in hours and in errors not made.',
  source:{name:'Bloomberg, February 2017; reported by the ABA Journal', url:'https://www.abajournal.com/news/article/jpmorgan_chase_uses_tech_to_save_360000_hours_of_annual_work_by_lawyers_and'}},

 {id:'msassist', title:'Answers from a hundred thousand reports', org:'Morgan Stanley Wealth Management', year:2023, kind:'success',
  caps:['retrieve','converse'], verdicts:['pilot'], guardrails:['sampling','privacy'], shapes:['lookup'],
  what:'The firm gave its financial advisors an internal assistant that answers questions from its own library of research reports and documents.',
  outcome:'The firm says 98% of its advisor teams have adopted it.',
  lesson:'Retrieval is only as good as the library behind it. Curate the source first, and test answers against questions people actually ask.',
  source:{name:'Morgan Stanley press release on AI @ Morgan Stanley', url:'https://www.morganstanley.com/press-releases/ai-at-morgan-stanley-debrief-launch'}},

 {id:'danske', title:'Fewer false alarms', org:'Danske Bank', year:2017, kind:'success',
  caps:['anomaly','classify'], verdicts:['prepare','pilot','assist'], guardrails:['threshold','sampling'], shapes:['check'],
  what:'The bank’s rule-based fraud screening raised about 1,200 false alarms a day, each one investigated by hand. It added machine-learning models on top of the rules.',
  outcome:'The bank said the models cut false positives by about half in its own announcement; its technology partner reported 60%. Investigators spent the time on real cases.',
  lesson:'Anomaly detection pays by reducing noise, not only by catching more. Tune the threshold, and measure the alarms people stop reading.',
  source:{name:'Teradata and Danske Bank announcement, October 2017', url:'https://s206.q4cdn.com/560882062/files/doc_news/Danske-Bank-and-Teradata-Implement-Artificial-Intelligence-AI-Engine-that-Monitors-Fraud-in-Real-Time-10-23-2017-2017.pdf'}},

 {id:'wellsfargo', title:'The target that became the job', org:'Wells Fargo', year:2016, kind:'warning',
  caps:['fix'], verdicts:['fix','capture'], guardrails:['logging','escalation'], shapes:['coordinate','decide'],
  what:'Branch staff were set aggressive targets for the number of products each customer held, with pay and pressure tied to the count.',
  outcome:'Staff opened more than two million deposit and card accounts customers may not have authorised. In 2016 the bank paid $185 million in penalties, including $100 million to the CFPB, and the estimate of affected accounts later grew to 3.5 million.',
  lesson:'Reward the outcome, not the activity. Any score or leaderboard you add, for data entry or anything else, will be gamed if it counts volume instead of quality.',
  source:{name:'Consumer Financial Protection Bureau, September 2016', url:'https://www.consumerfinance.gov/archive/newsroom/consumer-financial-protection-bureau-fines-wells-fargo-100-million-widespread-illegal-practice-secretly-opening-unauthorized-accounts/'}},

 {id:'baddata', title:'The cost of bad records', org:'Gartner research', year:2021, kind:'mixed',
  caps:['fix','extract','anomaly'], verdicts:['capture','prepare','fix'], guardrails:['sampling'], shapes:['extract','check','coordinate'],
  what:'Gartner surveyed organisations on what poor-quality data costs them in rework, bad decisions and missed opportunities.',
  outcome:'Respondents estimated an average of $12.9 million a year. It is a self-reported survey figure, useful as a rough scale rather than a measurement.',
  lesson:'Before any tool can read your records, the records have to be right. Capturing data well at the source is often the highest-value step, and the least glamorous.',
  source:{name:'Gartner, “12 Actions to Improve Data Quality”; discussed by Formtek', url:'https://formtek.com/blog/data-quality-the-cost-of-bad-data'}},
];

export function reportById(id){ return FIELD_REPORTS.find(r=>r.id===id); }

/* The most relevant report for a step's read: capability first, then verdict,
   then the kind of work. `seen` lets the game prefer a case not yet collected. */
export function reportFor({cap, verdict, shape}, seen){
  const score = r=> (r.caps.includes(cap)?4:0) + (r.caps[0]===cap?1:0) + (r.verdicts.includes(verdict)?2:0) + (r.shapes.includes(shape)?1:0);
  const ranked = FIELD_REPORTS.map(r=>({r, s:score(r) + (seen && !seen[r.id] ? 0.5 : 0)})).filter(x=>x.s>=2).sort((a,b)=>b.s-a.s);
  return ranked.length ? ranked[0].r : null;
}
