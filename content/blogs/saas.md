+++
title = "Saas Writeup (ImaginaryCTF 2021)"
date = "2021-08-02"
updated = "2024-07-12"
+++

# Saas Writeup (ImaginaryCTF 2021)

The challenge is to bypass the checks to get the flag. The description gave the basic idea that it uses sed. This is a pretty straightforward challenge if you are familiar with bash. After reading the blacklist I used to wildcard operator to bypass the checks. You input this:

```
'' *
```

And you find the flag in the output

#### flag >> `ictf{:roocu:roocu:roocu:roocu:roocu:roocursion:rsion:rsion:rsion:rsion:rsion:_473fc2d1}`
